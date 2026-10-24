import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectTestDb, disconnectTestDb } from "../helpers/db.js";
import {
  createSignedInUser, newAgent, placeOrder, registerTenant, seedCatalog, warehousePayload,
} from "../helpers/factories.js";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);

const API = "/api/v1/catalog";
const missingId = "65a1b2c3d4e5f60718293a4b";

describe("catalog authorization", () => {
  it("requires a session for every route", async () => {
    const anonymous = newAgent();
    expect((await anonymous.get(`${API}/warehouses`)).status).toBe(401);
    expect((await anonymous.get(`${API}/products`)).status).toBe(401);
    expect((await anonymous.get(`${API}/inventory`)).status).toBe(401);
  });

  it("lets customers browse but not manage the catalog", async () => {
    const tenant = await registerTenant();
    await seedCatalog(tenant);
    const { agent } = await createSignedInUser(tenant, "CUSTOMER");

    expect((await agent.get(`${API}/warehouses`)).status).toBe(200);
    expect((await agent.get(`${API}/products`)).body.data).toHaveLength(1);
    expect((await agent.post(`${API}/warehouses`).send(warehousePayload("X1"))).status).toBe(403);
    expect((await agent.post(`${API}/products`).send({ sku: "S", name: "N", price: 1 })).status).toBe(403);
    expect((await agent.get(`${API}/inventory`)).status).toBe(403);
    expect((await agent.put(`${API}/inventory`).send({})).status).toBe(403);
  });

  it("allows fulfillment managers but not staff to manage inventory", async () => {
    const tenant = await registerTenant();
    const manager = await createSignedInUser(tenant, "FULFILLMENT_MANAGER");
    const staff = await createSignedInUser(tenant, "STAFF");
    expect((await manager.agent.get(`${API}/inventory`)).status).toBe(200);
    expect((await staff.agent.get(`${API}/inventory`)).status).toBe(403);
  });
});

describe("warehouses and products", () => {
  it("creates warehouses, upper-casing the code, and rejects duplicates", async () => {
    const tenant = await registerTenant();
    const created = await tenant.admin.post(`${API}/warehouses`).send(warehousePayload("east-1"));
    expect(created.status).toBe(201);
    expect(created.body.data.code).toBe("EAST-1");
    const duplicate = await tenant.admin.post(`${API}/warehouses`).send(warehousePayload("EAST-1"));
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("WAREHOUSE_CODE_TAKEN");
    const list = await tenant.admin.get(`${API}/warehouses`);
    expect(list.body.data.map((w: { code: string }) => w.code)).toEqual(["EAST-1"]);
  });

  it("validates warehouse input", async () => {
    const tenant = await registerTenant();
    const response = await tenant.admin.post(`${API}/warehouses`).send({ code: "!", name: "" });
    expect(response.status).toBe(400);
  });

  it("creates products with the tenant currency, rounds price and rejects duplicate SKUs", async () => {
    const tenant = await registerTenant();
    const created = await tenant.admin.post(`${API}/products`).send({ sku: "A-1", name: "Gadget", price: 10.456 });
    expect(created.status).toBe(201);
    const list = await tenant.admin.get(`${API}/products`);
    expect(list.body.data[0]).toMatchObject({ sku: "A-1", price: 10.46, priceMinor: 1046, currency: "USD", sellable: 0 });
    const duplicate = await tenant.admin.post(`${API}/products`).send({ sku: "A-1", name: "Again", price: 1 });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("SKU_TAKEN");
    expect((await tenant.admin.post(`${API}/products`).send({ sku: "B", name: "Neg", price: -1 })).status).toBe(400);
  });

  it("scopes data to the tenant", async () => {
    const a = await registerTenant();
    const b = await registerTenant();
    await seedCatalog(a);
    expect((await b.admin.get(`${API}/products`)).body.data).toEqual([]);
    expect((await b.admin.get(`${API}/warehouses`)).body.data).toEqual([]);
  });
});

describe("inventory", () => {
  it("sets stock, reports sellable = available - reserved, and lists rows", async () => {
    const tenant = await registerTenant();
    const { warehouseId, productId } = await seedCatalog(tenant, { stock: 10 });
    const customer = await createSignedInUser(tenant, "CUSTOMER");
    await placeOrder(customer.agent, warehouseId, productId, 4);

    const products = await customer.agent.get(`${API}/products`).query({ warehouseId });
    expect(products.body.data[0].sellable).toBe(6);
    const rows = await tenant.admin.get(`${API}/inventory`);
    expect(rows.body.data[0]).toMatchObject({ available: 10, reserved: 4, sku: "SKU-1", productName: "Widget" });
  });

  it("refuses to drop stock below the reserved quantity", async () => {
    const tenant = await registerTenant();
    const { warehouseId, productId } = await seedCatalog(tenant, { stock: 10 });
    const customer = await createSignedInUser(tenant, "CUSTOMER");
    await placeOrder(customer.agent, warehouseId, productId, 4);

    const tooLow = await tenant.admin.put(`${API}/inventory`).send({ warehouseId, productId, available: 3 });
    expect(tooLow.status).toBe(409);
    expect(tooLow.body.error.code).toBe("STOCK_BELOW_RESERVED");
    expect((await tenant.admin.put(`${API}/inventory`).send({ warehouseId, productId, available: 4 })).status).toBe(200);
  });

  it("returns 404 for unknown products or warehouses and 400 for bad input", async () => {
    const tenant = await registerTenant();
    const { warehouseId } = await seedCatalog(tenant);
    const unknown = await tenant.admin
      .put(`${API}/inventory`)
      .send({ warehouseId, productId: missingId, available: 1 });
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe("PRODUCT_OR_WAREHOUSE_NOT_FOUND");
    expect((await tenant.admin.put(`${API}/inventory`).send({ warehouseId, productId: "x", available: 1 })).status).toBe(400);
    expect((await tenant.admin.get(`${API}/products`).query({ limit: 0 })).status).toBe(400);
  });
});
