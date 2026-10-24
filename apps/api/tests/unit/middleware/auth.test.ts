import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "../../../src/config/env.js";
import {
  clearSessionCookie, createSessionToken, readSessionIdentity, requireDashboardRole,
  requireRoles, requireTrustedOrigin, setSessionCookie, authenticate,
} from "../../../src/middleware/auth.js";
import { requestId } from "../../../src/middleware/request-id.js";

const userId = "65a1b2c3d4e5f60718293a4b";
const tenantId = "65a1b2c3d4e5f60718293a4c";

function fakeResponse() {
  const response = {
    locals: {} as Record<string, unknown>,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  };
  return response;
}
const fakeRequest = (init: Record<string, unknown> = {}) => ({
  headers: {} as Record<string, string>,
  get: (name: string) => (init.headers as Record<string, string> | undefined)?.[name.toLowerCase()],
  ...init,
});
const cookieOf = (token: string) => ({ headers: { cookie: `a=1; commerceflow_session=${encodeURIComponent(token)}` } });

afterEach(() => {
  (env as { NODE_ENV: string }).NODE_ENV = "test";
});

describe("requestId", () => {
  it("assigns a UUID to the response header and locals", () => {
    const response = fakeResponse();
    const next = vi.fn();
    requestId({} as never, response as never, next);
    expect(response.locals.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.setHeader).toHaveBeenCalledWith("X-Request-Id", response.locals.requestId);
    expect(next).toHaveBeenCalledOnce();
  });
});

describe("session tokens", () => {
  it("round-trips identity through createSessionToken/readSessionIdentity", () => {
    const token = createSessionToken(userId, tenantId, 3);
    expect(readSessionIdentity(cookieOf(token) as never)).toEqual({ userId, tenantId, tokenVersion: 3 });
  });

  it("defaults the token version to 0", () => {
    const token = createSessionToken(userId, tenantId);
    expect(readSessionIdentity(cookieOf(token) as never)?.tokenVersion).toBe(0);
  });

  it("rejects missing, malformed, expired, wrongly signed and wrongly scoped tokens", () => {
    expect(readSessionIdentity({ headers: {} } as never)).toBeNull();
    expect(readSessionIdentity(cookieOf("garbage") as never)).toBeNull();
    expect(readSessionIdentity({ headers: { cookie: "commerceflow_session=%E0%A4%A" } } as never)).toBeNull();
    expect(readSessionIdentity({ headers: { cookie: "novalue; other=1" } } as never)).toBeNull();

    const sign = (claims: object, options: jwt.SignOptions = {}, secret = env.JWT_SECRET) =>
      jwt.sign(claims, secret, { issuer: "commerceflow-api", audience: "commerceflow-web", ...options });
    expect(readSessionIdentity(cookieOf(sign({ tenantId }, { subject: userId, expiresIn: -10 })) as never)).toBeNull();
    expect(readSessionIdentity(cookieOf(sign({ tenantId }, { subject: userId }, "x".repeat(40))) as never)).toBeNull();
    expect(readSessionIdentity(cookieOf(sign({ tenantId }, { subject: userId, audience: "other" })) as never)).toBeNull();
    expect(readSessionIdentity(cookieOf(sign({ tenantId }, { subject: "not-an-object-id" })) as never)).toBeNull();
    expect(readSessionIdentity(cookieOf(sign({ tenantId: "nope" }, { subject: userId })) as never)).toBeNull();
    expect(readSessionIdentity(cookieOf(sign({}, { subject: userId })) as never)).toBeNull();
  });
});

describe("session cookies", () => {
  it("sets an HttpOnly, SameSite=Strict cookie, adding Secure in production only", () => {
    const dev = fakeResponse();
    setSessionCookie(dev as never, "tok en");
    const devCookie = dev.setHeader.mock.calls[0]![1] as string;
    expect(devCookie).toContain("commerceflow_session=tok%20en");
    expect(devCookie).toContain("HttpOnly");
    expect(devCookie).toContain("SameSite=Strict");
    expect(devCookie).not.toContain("Secure");

    (env as { NODE_ENV: string }).NODE_ENV = "production";
    const prod = fakeResponse();
    setSessionCookie(prod as never, "t");
    expect(prod.setHeader.mock.calls[0]![1]).toContain("; Secure");
  });

  it("clears the cookie with Max-Age=0 and disables caching", () => {
    (env as { NODE_ENV: string }).NODE_ENV = "production";
    const response = fakeResponse();
    clearSessionCookie(response as never);
    expect(response.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    const cookie = response.setHeader.mock.calls[1]![1] as string;
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("Secure");
  });
});

describe("authenticate (rejection paths that need no database)", () => {
  it("returns 401 when there is no cookie", async () => {
    const response = fakeResponse();
    const next = vi.fn();
    await authenticate(fakeRequest() as never, response as never, next);
    expect(response.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid or expired JWT", async () => {
    for (const token of ["garbage", jwt.sign({ tenantId }, env.JWT_SECRET, {
      subject: userId, issuer: "commerceflow-api", audience: "commerceflow-web", expiresIn: -5,
    })]) {
      const response = fakeResponse();
      await authenticate(fakeRequest(cookieOf(token)) as never, response as never, vi.fn());
      expect(response.status).toHaveBeenCalledWith(401);
    }
  });

  it("returns 401 for tokens whose claims are not object ids", async () => {
    const token = jwt.sign({ tenantId: "bad" }, env.JWT_SECRET, {
      subject: userId, issuer: "commerceflow-api", audience: "commerceflow-web",
    });
    const response = fakeResponse();
    await authenticate(fakeRequest(cookieOf(token)) as never, response as never, vi.fn());
    expect(response.json).toHaveBeenCalledWith({ error: { code: "UNAUTHENTICATED" } });
  });

  it("returns 401 for a string payload", async () => {
    const token = jwt.sign("plain-string", env.JWT_SECRET);
    const response = fakeResponse();
    await authenticate(fakeRequest(cookieOf(token)) as never, response as never, vi.fn());
    expect(response.status).toHaveBeenCalledWith(401);
  });
});

describe("authorization guards", () => {
  it("requireRoles allows listed roles and rejects others or anonymous callers", () => {
    const guard = requireRoles("TENANT_ADMIN", "FULFILLMENT_MANAGER");
    const allowed = vi.fn();
    guard({ auth: { role: "TENANT_ADMIN" } } as never, fakeResponse() as never, allowed);
    expect(allowed).toHaveBeenCalledOnce();

    for (const auth of [{ role: "CUSTOMER" }, { role: "STAFF" }, undefined]) {
      const response = fakeResponse();
      const next = vi.fn();
      guard({ auth } as never, response as never, next);
      expect(response.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    }
  });

  it("requireDashboardRole blocks only customers", () => {
    const customer = fakeResponse();
    requireDashboardRole({ auth: { role: "CUSTOMER" } } as never, customer as never, vi.fn());
    expect(customer.status).toHaveBeenCalledWith(403);

    const next = vi.fn();
    requireDashboardRole({ auth: { role: "STAFF" } } as never, fakeResponse() as never, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("requireTrustedOrigin allows no Origin or the web origin, and blocks others", () => {
    const pass = vi.fn();
    requireTrustedOrigin(fakeRequest() as never, fakeResponse() as never, pass);
    requireTrustedOrigin(fakeRequest({ headers: { origin: env.WEB_ORIGIN } }) as never, fakeResponse() as never, pass);
    expect(pass).toHaveBeenCalledTimes(2);

    const response = fakeResponse();
    const next = vi.fn();
    requireTrustedOrigin(fakeRequest({ headers: { origin: "https://evil.example" } }) as never, response as never, next);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ error: { code: "INVALID_ORIGIN" } });
    expect(next).not.toHaveBeenCalled();
  });
});
