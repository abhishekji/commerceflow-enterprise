import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectTestDb, disconnectTestDb } from "../helpers/db.js";
import {
  cardPayment, createSignedInUser, newAgent, placeOrder, registerTenant, seedCatalog,
} from "../helpers/factories.js";
import { Inventory } from "../../src/modules/catalog/inventory/inventory.model.js";
import { OutboxEvent } from "../../src/modules/events/outbox-event.model.js";
import { AuditLog } from "../../src/modules/audit/audit-log.model.js";
import { Shipment } from "../../src/modules/fulfillment/shipment.model.js";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);

const API = "/api/v1/orders";
const missingId = "65a1b2c3d4e5f60718293a4b";

async function setup(stock = 10) {
  const tenant = await registerTenant();
  const catalog = await seedCatalog(tenant, { stock, price: 12.5 });
  const customer = await createSignedInUser(tenant, "CUSTOMER");
  return { tenant, ...catalog, customer };
}

describe("checkout", () => {
  it("creates a PENDING/UNPAID order, reserves stock and writes outbox + audit records", async () => {
    const { tenant, warehouseId, productId, customer } = await setup();
    const response = await customer.agent
      .post(API)
      .send({ warehouseId, items: [{ productId, quantity: 3 }] });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      status: "PENDING",
      paymentStatus: "UNPAID",
      totalMinor: 3750,
      currency: "USD",
      customerId: customer.userId,
    });
    expect(response.body.data.items[0]).toMatchObject({ quantity: 3, unitPriceMinor: 1250 });

    const stock = await Inventory.findOne({ tenantId: tenant.tenantId, productId }).lean();
    expect(stock).toMatchObject({ available: 10, reserved: 3 });
    const orderId = response.body.data.id;
    expect(await OutboxEvent.countDocuments({ aggregateId: orderId, eventType: "order.created", status: "PENDING" })).toBe(1);
    expect(await AuditLog.countDocuments({ resourceId: orderId, action: "order.created" })).toBe(1);
  });

  it("rejects insufficient stock atomically without reserving anything", async () => {
    const { warehouseId, productId, customer, tenant } = await setup(2);
    const response = await customer.agent.post(API).send({ warehouseId, items: [{ productId, quantity: 3 }] });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INSUFFICIENT_INVENTORY");
    expect(await Inventory.findOne({ tenantId: tenant.tenantId, productId }).lean()).toMatchObject({ reserved: 0 });
    expect((await customer.agent.get(API)).body.data).toEqual([]);
  });

  it("does not oversell under concurrent checkouts", async () => {
    const { warehouseId, productId, tenant } = await setup(1);
    const buyers = await Promise.all([createSignedInUser(tenant, "CUSTOMER"), createSignedInUser(tenant, "CUSTOMER")]);
    const results = await Promise.all(
      buyers.map((buyer) => buyer.agent.post(API).send({ warehouseId, items: [{ productId, quantity: 1 }] })),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await Inventory.findOne({ tenantId: tenant.tenantId, productId }).lean()).toMatchObject({ reserved: 1 });
  });

  it("validates the body and the referenced warehouse/products", async () => {
    const { warehouseId, productId, customer } = await setup();
    expect((await customer.agent.post(API).send({ warehouseId, items: [] })).status).toBe(400);
    expect((await customer.agent.post(API).send({ warehouseId, items: [{ productId, quantity: 0 }] })).status).toBe(400);
    const noWarehouse = await customer.agent.post(API).send({ warehouseId: missingId, items: [{ productId, quantity: 1 }] });
    expect(noWarehouse.status).toBe(404);
    expect(noWarehouse.body.error.code).toBe("WAREHOUSE_NOT_FOUND");
    const noProduct = await customer.agent.post(API).send({ warehouseId, items: [{ productId: missingId, quantity: 1 }] });
    expect(noProduct.status).toBe(400);
    expect(noProduct.body.error.code).toBe("PRODUCT_NOT_FOUND_OR_INACTIVE");
  });

  it("requires authentication and a trusted origin", async () => {
    const { warehouseId, productId, customer } = await setup();
    const body = { warehouseId, items: [{ productId, quantity: 1 }] };
    expect((await newAgent().post(API).send(body)).status).toBe(401);
    const badOrigin = await customer.agent.post(API).set("Origin", "https://evil.example").send(body);
    expect(badOrigin.status).toBe(403);
  });

  it("rejects mixed currencies", async () => {
    const { tenant, warehouseId, productId, customer } = await setup();
    const eur = await tenant.admin.post("/api/v1/catalog/products").send({ sku: "EUR-1", name: "Euro item", price: 5, currency: "eur" });
    await tenant.admin.put("/api/v1/catalog/inventory").send({ warehouseId, productId: eur.body.data.id, available: 5 });
    const response = await customer.agent.post(API).send({
      warehouseId,
      items: [{ productId, quantity: 1 }, { productId: eur.body.data.id, quantity: 1 }],
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("MIXED_CURRENCIES");
  });
});

describe("listing and reading orders", () => {
  it("customers see only their own orders; staff see all; filters and limits apply", async () => {
    const { tenant, warehouseId, productId, customer } = await setup();
    const other = await createSignedInUser(tenant, "CUSTOMER");
    await placeOrder(customer.agent, warehouseId, productId, 1);
    const otherOrder = await placeOrder(other.agent, warehouseId, productId, 1);

    expect((await customer.agent.get(API)).body.data).toHaveLength(1);
    expect((await tenant.admin.get(API)).body.data).toHaveLength(2);
    expect((await tenant.admin.get(API).query({ status: "PENDING", limit: 1 })).body.data).toHaveLength(1);
    expect((await tenant.admin.get(API).query({ status: "SHIPPED" })).body.data).toHaveLength(0);
    expect((await tenant.admin.get(API).query({ status: "BOGUS" })).status).toBe(400);

    expect((await customer.agent.get(`${API}/${otherOrder.id}`)).status).toBe(404);
    expect((await tenant.admin.get(`${API}/${otherOrder.id}`)).status).toBe(200);
  });

  it("GET /orders/:id returns 404 for unknown ids, 400 for malformed ids and hides other tenants", async () => {
    const { warehouseId, productId, customer } = await setup();
    const order = await placeOrder(customer.agent, warehouseId, productId, 1);
    const stranger = await registerTenant();
    expect((await customer.agent.get(`${API}/${order.id}`)).body.data.id).toBe(order.id);
    expect((await customer.agent.get(`${API}/${missingId}`)).body.error.code).toBe("ORDER_NOT_FOUND");
    expect((await customer.agent.get(`${API}/not-an-id`)).status).toBe(400);
    expect((await stranger.admin.get(`${API}/${order.id}`)).status).toBe(404);
  });
});

describe("order transitions", () => {
  const transition = (agent: ReturnType<typeof newAgent>, id: string, status: string) =>
    agent.post(`${API}/${id}/transition`).send({ status });

  it("blocks confirming an unpaid order", async () => {
    const { tenant, warehouseId, productId, customer } = await setup();
    const order = await placeOrder(customer.agent, warehouseId, productId, 1);
    const response = await transition(tenant.admin, order.id, "CONFIRMED");
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("PAYMENT_REQUIRED");
  });

  it("runs the full lifecycle: pay, confirm, pack, ship (stock committed), deliver", async () => {
    const { tenant, warehouseId, productId, customer } = await setup();
    const order = await placeOrder(customer.agent, warehouseId, productId, 4);
    await customer.agent.post(`/api/v1/payments/orders/${order.id}/pay`).send(cardPayment());

    const confirmed = await transition(tenant.admin, order.id, "CONFIRMED");
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.shipment).toMatchObject({ status: "REQUESTED" });
    expect(await Shipment.countDocuments({ orderId: order.id })).toBe(1);

    expect((await transition(tenant.admin, order.id, "FULFILLING")).body.data.shipment.status).toBe("PACKING");
    const shipped = await transition(tenant.admin, order.id, "SHIPPED");
    expect(shipped.body.data.shipment.status).toBe("IN_TRANSIT");
    expect(await Inventory.findOne({ productId, tenantId: tenant.tenantId }).lean()).toMatchObject({ available: 6, reserved: 0 });
    const delivered = await transition(tenant.admin, order.id, "DELIVERED");
    expect(delivered.body.data).toMatchObject({ status: "DELIVERED" });
    expect(delivered.body.data.shipment.status).toBe("DELIVERED");
  });

  it("rejects invalid transitions and unknown orders", async () => {
    const { tenant, warehouseId, productId, customer } = await setup();
    const order = await placeOrder(customer.agent, warehouseId, productId, 1);
    const invalid = await transition(tenant.admin, order.id, "DELIVERED");
    expect(invalid.status).toBe(409);
    expect(invalid.body.error.code).toBe("INVALID_ORDER_TRANSITION");
    expect((await transition(tenant.admin, missingId, "CANCELLED")).status).toBe(404);
    expect((await transition(tenant.admin, order.id, "BOGUS")).status).toBe(400);
  });

  it("lets a customer cancel their own pending order, releasing the reservation", async () => {
    const { tenant, warehouseId, productId, customer } = await setup();
    const order = await placeOrder(customer.agent, warehouseId, productId, 5);
    const response = await transition(customer.agent, order.id, "CANCELLED");
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("CANCELLED");
    expect(await Inventory.findOne({ productId, tenantId: tenant.tenantId }).lean()).toMatchObject({ reserved: 0 });
  });

  it("stops customers from doing anything but cancelling their own order", async () => {
    const { tenant, warehouseId, productId, customer } = await setup();
    const order = await placeOrder(customer.agent, warehouseId, productId, 1);
    const other = await createSignedInUser(tenant, "CUSTOMER");
    expect((await transition(customer.agent, order.id, "SHIPPED")).status).toBe(403);
    expect((await transition(other.agent, order.id, "CANCELLED")).status).toBe(404);

    await customer.agent.post(`/api/v1/payments/orders/${order.id}/pay`).send({ method: "COD" });
    await transition(tenant.admin, order.id, "CONFIRMED");
    await transition(tenant.admin, order.id, "FULFILLING");
    expect((await transition(customer.agent, order.id, "CANCELLED")).status).toBe(403);
  });

  it("refunds a paid order when it is cancelled", async () => {
    const { tenant, warehouseId, productId, customer } = await setup();
    const order = await placeOrder(customer.agent, warehouseId, productId, 1);
    await customer.agent.post(`/api/v1/payments/orders/${order.id}/pay`).send(cardPayment());
    const cancelled = await transition(tenant.admin, order.id, "CANCELLED");
    expect(cancelled.body.data.paymentStatus).toBe("REFUNDED");
  });
});
