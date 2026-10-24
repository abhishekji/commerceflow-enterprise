import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectTestDb, disconnectTestDb } from "../helpers/db.js";
import {
  cardPayment, createSignedInUser, newAgent, placeOrder, registerTenant, seedCatalog,
} from "../helpers/factories.js";
import { Payment } from "../../src/modules/payments/payment.model.js";
import { OutboxEvent } from "../../src/modules/events/outbox-event.model.js";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);

const pay = (agent: ReturnType<typeof newAgent>, id: string, body: unknown) =>
  agent.post(`/api/v1/payments/orders/${id}/pay`).send(body as object);
const missingId = "65a1b2c3d4e5f60718293a4b";

async function pendingOrder() {
  const tenant = await registerTenant();
  const { warehouseId, productId } = await seedCatalog(tenant, { price: 20, stock: 10 });
  const customer = await createSignedInUser(tenant, "CUSTOMER");
  const order = await placeOrder(customer.agent, warehouseId, productId, 2);
  return { tenant, customer, order };
}

describe("GET /payments/methods", () => {
  it("lists the dummy methods and sandbox hints for signed-in users only", async () => {
    const tenant = await registerTenant();
    const response = await tenant.admin.get("/api/v1/payments/methods");
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      methods: ["CARD", "UPI", "NET_BANKING", "WALLET", "COD"],
      sandbox: true,
    });
    expect((await newAgent().get("/api/v1/payments/methods")).status).toBe(401);
  });
});

describe("POST /payments/orders/:id/pay", () => {
  it("marks the order PAID with a masked instrument and queues payment.succeeded", async () => {
    const { customer, order } = await pendingOrder();
    const response = await pay(customer.agent, order.id, cardPayment());
    expect(response.status).toBe(200);
    expect(response.body.data.reference).toMatch(/^PAY-/);
    expect(response.body.data.order).toMatchObject({ paymentStatus: "PAID", paymentMethod: "CARD" });
    expect(response.body.data.order.paymentSummary).toContain("4242");
    expect(response.body.data.order.paymentSummary).not.toContain("4242 4242");
    expect(JSON.stringify(response.body)).not.toContain("123");
    expect(await Payment.countDocuments({ orderId: order.id, status: "SUCCEEDED" })).toBe(1);
    expect(await OutboxEvent.countDocuments({ aggregateId: order.id, eventType: "payment.succeeded" })).toBe(1);
  });

  it("declines the test decline card, records a FAILED payment and leaves the order payable", async () => {
    const { customer, order } = await pendingOrder();
    const declined = await pay(customer.agent, order.id, cardPayment("4000 0000 0000 0002"));
    expect(declined.status).toBe(402);
    expect(declined.body.error.code).toBe("PAYMENT_DECLINED");
    expect(await Payment.countDocuments({ orderId: order.id, status: "FAILED" })).toBe(1);
    expect((await pay(customer.agent, order.id, cardPayment())).status).toBe(200);
  });

  it("declines UPI ids starting with 'fail' and accepts others", async () => {
    const { customer, order } = await pendingOrder();
    expect((await pay(customer.agent, order.id, { method: "UPI", upiId: "failme@demo" })).status).toBe(402);
    expect((await pay(customer.agent, order.id, { method: "UPI", upiId: "ada@demo" })).status).toBe(200);
  });

  it("supports net banking, wallet and cash on delivery", async () => {
    const nb = await pendingOrder();
    expect((await pay(nb.customer.agent, nb.order.id, { method: "NET_BANKING", bank: "DEMO_BANK_A" })).body.data.order.paymentStatus).toBe("PAID");
    const wallet = await pendingOrder();
    expect((await pay(wallet.customer.agent, wallet.order.id, { method: "WALLET", wallet: "DEMO_PAY" })).status).toBe(200);
    const cod = await pendingOrder();
    const response = await pay(cod.customer.agent, cod.order.id, { method: "COD" });
    expect(response.body.data.order.paymentStatus).toBe("COD");
    expect(await Payment.countDocuments({ orderId: cod.order.id, status: "PENDING_COD" })).toBe(1);
  });

  it("validates card details", async () => {
    const { customer, order } = await pendingOrder();
    expect((await pay(customer.agent, order.id, cardPayment("4242 4242 4242 4243"))).body.error.code).toBe("INVALID_CARD_NUMBER");
    expect((await pay(customer.agent, order.id, { ...cardPayment(), expiry: "01/20" })).body.error.code).toBe("CARD_EXPIRED");
    expect((await pay(customer.agent, order.id, { ...cardPayment(), cvv: "1" })).status).toBe(400);
    expect((await pay(customer.agent, order.id, { method: "CHEQUE" })).status).toBe(400);
  });

  it("refuses a second payment and payment for cancelled orders", async () => {
    const { customer, order } = await pendingOrder();
    await pay(customer.agent, order.id, cardPayment());
    expect((await pay(customer.agent, order.id, cardPayment())).body.error.code).toBe("ALREADY_PAID");

    const second = await pendingOrder();
    await second.customer.agent.post(`/api/v1/orders/${second.order.id}/transition`).send({ status: "CANCELLED" });
    expect((await pay(second.customer.agent, second.order.id, cardPayment())).body.error.code).toBe("ORDER_NOT_PAYABLE");
  });

  it("only lets the owning customer pay, and requires authentication", async () => {
    const { tenant, customer, order } = await pendingOrder();
    const other = await createSignedInUser(tenant, "CUSTOMER");
    expect((await pay(other.agent, order.id, cardPayment())).status).toBe(404);
    expect((await pay(tenant.admin, order.id, cardPayment())).status).toBe(404);
    expect((await pay(newAgent(), order.id, cardPayment())).status).toBe(401);
    expect((await pay(customer.agent, missingId, cardPayment())).body.error.code).toBe("ORDER_NOT_FOUND");
    expect((await pay(customer.agent, "bad-id", cardPayment())).status).toBe(400);
  });
});
