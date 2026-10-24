import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { app } from "../../src/app.js";
import { User } from "../../src/modules/identity/user.model.js";

export const PASSWORD = "Sup3r-secret-pass";
export type Role = "TENANT_ADMIN" | "FULFILLMENT_MANAGER" | "STAFF" | "CUSTOMER";
export type Agent = ReturnType<typeof request.agent>;

export function newAgent(): Agent {
  return request.agent(app);
}

export function uniqueSlug(prefix = "t") {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export interface TestTenant {
  slug: string;
  tenantId: string;
  admin: Agent;
  adminId: string;
  adminEmail: string;
}

/** Registers a tenant through the API; the returned agent is signed in as its TENANT_ADMIN. */
export async function registerTenant(slug = uniqueSlug()): Promise<TestTenant> {
  const admin = newAgent();
  const adminEmail = `admin@${slug}.test`;
  const response = await admin.post("/api/v1/auth/register").send({
    tenantName: `Tenant ${slug}`,
    tenantSlug: slug,
    firstName: "Ada",
    lastName: "Admin",
    email: adminEmail,
    password: PASSWORD,
  });
  if (response.status !== 201) throw new Error(`register failed: ${response.status} ${JSON.stringify(response.body)}`);
  return {
    slug,
    tenantId: response.body.data.tenant.id,
    admin,
    adminId: response.body.data.user.id,
    adminEmail,
  };
}

/** Inserts a user directly (there is no public customer sign-up) and returns a signed-in agent. */
export async function createSignedInUser(tenant: Pick<TestTenant, "slug" | "tenantId">, role: Role, first = "Sam") {
  const email = `${role.toLowerCase()}-${randomUUID().slice(0, 6)}@${tenant.slug}.test`;
  const user = await User.create({
    tenantId: tenant.tenantId,
    email,
    passwordHash: await bcrypt.hash(PASSWORD, 4),
    firstName: first,
    lastName: role,
    role,
    status: "ACTIVE",
  });
  const agent = newAgent();
  const response = await agent.post("/api/v1/auth/login").send({ tenantSlug: tenant.slug, email, password: PASSWORD });
  if (response.status !== 200) throw new Error(`login failed: ${response.status}`);
  return { agent, userId: user._id.toString(), email };
}

export const warehousePayload = (code = "MAIN") => ({
  code,
  name: `Warehouse ${code}`,
  address: { line1: "1 Dock Rd", city: "Pune", postalCode: "411001", countryCode: "in" },
});

/** Creates a warehouse, a product and stock through the API as the tenant admin. */
export async function seedCatalog(tenant: TestTenant, options: { price?: number; stock?: number; sku?: string } = {}) {
  const warehouse = await tenant.admin.post("/api/v1/catalog/warehouses").send(warehousePayload());
  const product = await tenant.admin
    .post("/api/v1/catalog/products")
    .send({ sku: options.sku ?? "SKU-1", name: "Widget", price: options.price ?? 12.5 });
  const warehouseId: string = warehouse.body.data.id;
  const productId: string = product.body.data.id;
  const stock = await tenant.admin
    .put("/api/v1/catalog/inventory")
    .send({ warehouseId, productId, available: options.stock ?? 10 });
  if (stock.status !== 200) throw new Error(`seed stock failed: ${stock.status}`);
  return { warehouseId, productId };
}

export async function placeOrder(agent: Agent, warehouseId: string, productId: string, quantity = 2) {
  const response = await agent.post("/api/v1/orders").send({ warehouseId, items: [{ productId, quantity }] });
  if (response.status !== 201) throw new Error(`checkout failed: ${response.status} ${JSON.stringify(response.body)}`);
  return response.body.data as { id: string; totalMinor: number; status: string; paymentStatus: string };
}

export const cardPayment = (cardNumber = "4242 4242 4242 4242") => ({
  method: "CARD",
  cardholderName: "Ada Lovelace",
  cardNumber,
  expiry: "12/99",
  cvv: "123",
});
