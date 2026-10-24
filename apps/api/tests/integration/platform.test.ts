import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectTestDb, disconnectTestDb } from "../helpers/db.js";
import {
  createSignedInUser, newAgent, placeOrder, registerTenant, seedCatalog,
} from "../helpers/factories.js";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);

describe("GET /health", () => {
  it("reports UP when the database is connected", async () => {
    const response = await newAgent().get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "UP", database: "CONNECTED" });
  });
});

describe("platform behaviour", () => {
  it("adds a request id header and security headers, and hides x-powered-by", async () => {
    const response = await newAgent().get("/api/v1/health");
    expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("allows CORS with credentials only for the configured web origin", async () => {
    const allowed = await newAgent().get("/api/v1/health").set("Origin", "http://localhost:5173");
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(allowed.headers["access-control-allow-credentials"]).toBe("true");
    const denied = await newAgent().get("/api/v1/health").set("Origin", "https://evil.example");
    expect(denied.headers["access-control-allow-origin"]).not.toBe("https://evil.example");
  });

  it("returns a JSON 400 for malformed JSON and 413 for oversized bodies", async () => {
    const malformed = await newAgent().post("/api/v1/auth/login").set("Content-Type", "application/json").send("{bad");
    expect(malformed.status).toBe(400);
    expect(malformed.body.requestId).toBeDefined();
    const huge = await newAgent().post("/api/v1/auth/login").send({ pad: "x".repeat(1_200_000) });
    expect(huge.status).toBe(413);
    expect(huge.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});

describe("dashboard", () => {
  it("is forbidden to customers and unauthenticated users", async () => {
    const tenant = await registerTenant();
    const customer = await createSignedInUser(tenant, "CUSTOMER");
    expect((await customer.agent.get("/api/v1/dashboard/summary")).status).toBe(403);
    expect((await newAgent().get("/api/v1/dashboard/summary")).status).toBe(401);
  });

  it("serves filters, summary and timeseries to staff, including a warehouse filter", async () => {
    const tenant = await registerTenant();
    const { warehouseId, productId } = await seedCatalog(tenant);
    const customer = await createSignedInUser(tenant, "CUSTOMER");
    await placeOrder(customer.agent, warehouseId, productId, 2);
    const staff = await createSignedInUser(tenant, "STAFF");

    const filters = await staff.agent.get("/api/v1/dashboard/filters");
    expect(filters.status).toBe(200);
    expect(JSON.stringify(filters.body)).toContain(warehouseId);

    for (const path of ["summary", "timeseries"]) {
      const all = await staff.agent.get(`/api/v1/dashboard/${path}`);
      const scoped = await staff.agent.get(`/api/v1/dashboard/${path}`).query({ warehouseId });
      expect(all.status).toBe(200);
      expect(scoped.status).toBe(200);
      expect(all.body.data).toBeDefined();
    }
  });

  it("rejects malformed warehouse ids", async () => {
    const tenant = await registerTenant();
    const response = await tenant.admin.get("/api/v1/dashboard/summary").query({ warehouseId: "nope" });
    expect(response.status).toBe(400);
  });
});
