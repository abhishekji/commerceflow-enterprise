import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { connectTestDb, disconnectTestDb } from "../helpers/db.js";
import {
  cardPayment, createSignedInUser, placeOrder, registerTenant, seedCatalog,
} from "../helpers/factories.js";
import { publishPendingEvents } from "../../src/messaging/outbox-publisher.js";
import type { DomainMessage, MessageBus } from "../../src/messaging/message-bus.js";
import { handleDomainMessage } from "../../src/modules/fulfillment/event-handlers.js";
import { OutboxEvent } from "../../src/modules/events/outbox-event.model.js";
import { Notification } from "../../src/modules/notifications/notification.model.js";
import { startWorkers } from "../../src/workers/index.js";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);

function captureBus(failures = 0) {
  const published: DomainMessage[] = [];
  let remaining = failures;
  const bus: MessageBus = {
    kind: "local",
    async publish(message) {
      if (remaining > 0) {
        remaining -= 1;
        throw new Error("queue unavailable");
      }
      published.push(message);
    },
    start: () => undefined,
    stop: async () => undefined,
  };
  return { bus, published };
}

async function paidOrder() {
  const tenant = await registerTenant();
  const { warehouseId, productId } = await seedCatalog(tenant);
  const customer = await createSignedInUser(tenant, "CUSTOMER");
  const order = await placeOrder(customer.agent, warehouseId, productId, 1);
  return { tenant, customer, order };
}

describe("outbox publisher", () => {
  it("publishes pending events once, in order, and marks them PUBLISHED", async () => {
    const { order } = await paidOrder();
    const { bus, published } = captureBus();
    await publishPendingEvents(bus);
    const mine = published.filter((message) => message.aggregateId === order.id);
    expect(mine.map((message) => message.eventType)).toEqual(["order.created"]);
    expect(await OutboxEvent.findOne({ aggregateId: order.id })).toMatchObject({ status: "PUBLISHED", attempts: 1 });
    expect(await publishPendingEvents(bus)).toBe(0);
  });

  it("retries with back-off after a publish failure and records the error", async () => {
    const { order } = await paidOrder();
    const failing = captureBus(Number.MAX_SAFE_INTEGER);
    await publishPendingEvents(failing.bus);
    const event = await OutboxEvent.findOne({ aggregateId: order.id });
    expect(event).toMatchObject({ status: "PENDING", attempts: 1, lastError: "queue unavailable" });
    expect(event!.availableAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("gives up as FAILED after the maximum number of attempts", async () => {
    const { order } = await paidOrder();
    await OutboxEvent.updateOne({ aggregateId: order.id }, { attempts: 4 });
    await publishPendingEvents(captureBus(Number.MAX_SAFE_INTEGER).bus);
    expect(await OutboxEvent.findOne({ aggregateId: order.id })).toMatchObject({ status: "FAILED", attempts: 5 });
  });

  it("re-queues events stuck in PROCESSING for too long", async () => {
    const { order } = await paidOrder();
    await OutboxEvent.collection.updateOne(
      { aggregateId: (await OutboxEvent.findOne({ aggregateId: order.id }))!.aggregateId },
      { $set: { status: "PROCESSING", updatedAt: new Date(Date.now() - 120_000) } },
    );
    const { bus, published } = captureBus();
    await publishPendingEvents(bus);
    expect(published.some((message) => message.aggregateId === order.id)).toBe(true);
  });
});

describe("domain event handler", () => {
  const base = (order: { id: string }, tenantId: string, eventType: string, payload: object): DomainMessage => ({
    eventId: `evt-${Math.random().toString(16).slice(2)}`,
    tenantId,
    aggregateType: "Order",
    aggregateId: order.id,
    eventType,
    payload: payload as Record<string, unknown>,
  });

  it("notifies once per event even when the message is redelivered", async () => {
    const { tenant, customer, order } = await paidOrder();
    const message = base(order, tenant.tenantId, "order.created", { customerId: customer.userId });
    await handleDomainMessage(message);
    await handleDomainMessage(message);
    expect(await Notification.countDocuments({ orderId: order.id, type: "ORDER_RECEIVED" })).toBe(1);
  });

  it("ignores messages without a customer and unknown event types", async () => {
    const { tenant, order } = await paidOrder();
    await handleDomainMessage(base(order, tenant.tenantId, "order.created", {}));
    await handleDomainMessage(base(order, tenant.tenantId, "something.else", { customerId: "x" }));
    expect(await Notification.countDocuments({ orderId: order.id })).toBe(0);
  });

  it("describes refunds in cancellation notifications", async () => {
    const { tenant, customer, order } = await paidOrder();
    await handleDomainMessage(
      base(order, tenant.tenantId, "order.status_changed", { customerId: customer.userId, to: "CANCELLED", refunded: true }),
    );
    const note = await Notification.findOne({ orderId: order.id, type: "ORDER_CANCELLED" });
    expect(note?.message).toContain("refunded");
  });

  it("confirms a pending order when payment.succeeded arrives, and tolerates a repeat", async () => {
    const { tenant, customer, order } = await paidOrder();
    await customer.agent.post(`/api/v1/payments/orders/${order.id}/pay`).send(cardPayment());
    const message = base(order, tenant.tenantId, "payment.succeeded", {
      customerId: customer.userId, reference: "PAY-X", cashOnDelivery: false,
    });
    await handleDomainMessage(message);
    expect((await customer.agent.get(`/api/v1/orders/${order.id}`)).body.data.status).toBe("CONFIRMED");
    await expect(handleDomainMessage({ ...message, eventId: "evt-again" })).resolves.toBeUndefined();
  });
});

describe("background workers end to end", () => {
  it("pay -> outbox -> queue -> worker confirms the order and notifies the customer", async () => {
    const { customer, order } = await paidOrder();
    const stop = startWorkers();
    try {
      await customer.agent.post(`/api/v1/payments/orders/${order.id}/pay`).send({ method: "COD" });
      await vi.waitFor(
        async () => {
          const current = await customer.agent.get(`/api/v1/orders/${order.id}`);
          expect(current.body.data.status).toBe("CONFIRMED");
        },
        { timeout: 15_000, interval: 300 },
      );
      await vi.waitFor(async () => {
        const notes = await customer.agent.get("/api/v1/notifications");
        const types = notes.body.data.map((note: { type: string }) => note.type);
        expect(types).toEqual(expect.arrayContaining(["ORDER_RECEIVED", "PAYMENT_RECEIVED", "ORDER_CONFIRMED"]));
      }, { timeout: 15_000, interval: 300 });
    } finally {
      await stop();
    }
  });
});

describe("GET /notifications", () => {
  it("returns only the caller's notifications and requires a session", async () => {
    const { tenant, customer, order } = await paidOrder();
    const other = await createSignedInUser(tenant, "CUSTOMER");
    await handleDomainMessage({
      eventId: "evt-n1", tenantId: tenant.tenantId, aggregateType: "Order", aggregateId: order.id,
      eventType: "order.created", payload: { customerId: customer.userId },
    });
    expect((await customer.agent.get("/api/v1/notifications")).body.data).toHaveLength(1);
    expect((await other.agent.get("/api/v1/notifications")).body.data).toHaveLength(0);
    const anonymous = await (await import("../helpers/factories.js")).newAgent().get("/api/v1/notifications");
    expect(anonymous.status).toBe(401);
  });
});
