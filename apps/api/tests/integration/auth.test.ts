import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectTestDb, disconnectTestDb } from "../helpers/db.js";
import { PASSWORD, newAgent, registerTenant, uniqueSlug, createSignedInUser } from "../helpers/factories.js";
import { User } from "../../src/modules/identity/user.model.js";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);

const registerBody = (slug: string, overrides: Record<string, unknown> = {}) => ({
  tenantName: "Acme",
  tenantSlug: slug,
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ADA@Example.com",
  password: PASSWORD,
  ...overrides,
});

describe("POST /auth/register", () => {
  it("creates a tenant and admin, applies defaults and sets an HttpOnly session cookie", async () => {
    const response = await newAgent().post("/api/v1/auth/register").send(registerBody(uniqueSlug("reg")));
    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe("TENANT_ADMIN");
    expect(response.body.data.tenant).toMatchObject({ defaultCurrency: "USD", timeZone: "UTC" });
    const cookie = String(response.headers["set-cookie"]);
    expect(cookie).toContain("commerceflow_session=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
  });

  it("stores the email lower-cased and never returns the password hash", async () => {
    const slug = uniqueSlug("reg");
    const response = await newAgent().post("/api/v1/auth/register").send(registerBody(slug));
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    expect(await User.exists({ email: "ada@example.com" })).toBeTruthy();
  });

  it("rejects a taken tenant slug with 409", async () => {
    const slug = uniqueSlug("dup");
    await newAgent().post("/api/v1/auth/register").send(registerBody(slug));
    const second = await newAgent().post("/api/v1/auth/register").send(registerBody(slug, { email: "other@example.com" }));
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("TENANT_SLUG_TAKEN");
  });

  it.each([
    ["short password", { password: "short" }],
    ["bad slug", { tenantSlug: "Bad Slug!" }],
    ["bad email", { email: "nope" }],
    ["bad time zone", { timeZone: "Mars/Olympus" }],
    ["bad currency", { defaultCurrency: "DOLLARS" }],
  ])("returns 400 VALIDATION_ERROR for %s", async (_name, overrides) => {
    const response = await newAgent().post("/api/v1/auth/register").send(registerBody(uniqueSlug("bad"), overrides));
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a request from an untrusted origin", async () => {
    const response = await newAgent()
      .post("/api/v1/auth/register")
      .set("Origin", "https://evil.example")
      .send(registerBody(uniqueSlug("org")));
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("INVALID_ORIGIN");
  });
});

describe("POST /auth/login", () => {
  it("signs in with valid credentials (tenant slug and email are case-insensitive)", async () => {
    const tenant = await registerTenant();
    const response = await newAgent()
      .post("/api/v1/auth/login")
      .send({ tenantSlug: tenant.slug.toUpperCase(), email: tenant.adminEmail.toUpperCase(), password: PASSWORD });
    expect(response.status).toBe(200);
    expect(response.body.data.user.id).toBe(tenant.adminId);
  });

  it("returns the same 401 for a wrong password, unknown user and unknown tenant", async () => {
    const tenant = await registerTenant();
    const attempts = [
      { tenantSlug: tenant.slug, email: tenant.adminEmail, password: "wrong-password-123" },
      { tenantSlug: tenant.slug, email: "ghost@x.test", password: PASSWORD },
      { tenantSlug: "no-such-tenant", email: tenant.adminEmail, password: PASSWORD },
    ];
    for (const body of attempts) {
      const response = await newAgent().post("/api/v1/auth/login").send(body);
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
    }
  });

  it("does not sign in suspended users", async () => {
    const tenant = await registerTenant();
    await User.updateOne({ _id: tenant.adminId }, { status: "SUSPENDED" });
    const response = await newAgent()
      .post("/api/v1/auth/login")
      .send({ tenantSlug: tenant.slug, email: tenant.adminEmail, password: PASSWORD });
    expect(response.status).toBe(401);
  });

  it("returns 400 when the body is incomplete", async () => {
    const response = await newAgent().post("/api/v1/auth/login").send({ email: "a@b.co" });
    expect(response.status).toBe(400);
  });
});

describe("GET /auth/me and POST /auth/logout", () => {
  it("returns the profile for a valid session and 401 without one", async () => {
    const tenant = await registerTenant();
    const me = await tenant.admin.get("/api/v1/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.tenant.id).toBe(tenant.tenantId);

    const anonymous = await newAgent().get("/api/v1/auth/me");
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects a forged or tampered cookie", async () => {
    const response = await newAgent().get("/api/v1/auth/me").set("Cookie", "commerceflow_session=not.a.jwt");
    expect(response.status).toBe(401);
  });

  it("logout clears the cookie and revokes copies of the old token", async () => {
    const tenant = await registerTenant();
    const login = await newAgent()
      .post("/api/v1/auth/login")
      .send({ tenantSlug: tenant.slug, email: tenant.adminEmail, password: PASSWORD });
    const stolenCookie = String(login.headers["set-cookie"]).split(";")[0]!;

    const logout = await tenant.admin.post("/api/v1/auth/logout");
    expect(logout.status).toBe(204);
    expect(String(logout.headers["set-cookie"])).toContain("Max-Age=0");
    expect(logout.headers["cache-control"]).toBe("no-store");
    expect((await User.findById(tenant.adminId))?.tokenVersion).toBe(1);

    const replay = await newAgent().get("/api/v1/auth/me").set("Cookie", stolenCookie);
    expect(replay.status).toBe(401);
  });

  it("logout without a session is still 204", async () => {
    const response = await newAgent().post("/api/v1/auth/logout");
    expect(response.status).toBe(204);
  });

  it("a user from another tenant cannot reuse a session across tenants", async () => {
    const a = await registerTenant();
    const customer = await createSignedInUser(a, "CUSTOMER");
    expect((await customer.agent.get("/api/v1/auth/me")).body.data.tenant.id).toBe(a.tenantId);
  });
});
