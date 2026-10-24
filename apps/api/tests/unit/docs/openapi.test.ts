import { describe, expect, it } from "vitest";
import { buildOpenApiDocument } from "../../../src/docs/openapi.js";

type Doc = {
  openapi: string;
  servers: { url: string }[];
  paths: Record<string, Record<string, { responses: Record<string, unknown>; security?: unknown[]; tags: string[] }>>;
  components: { schemas: Record<string, unknown>; securitySchemes: Record<string, unknown> };
  tags: { name: string }[];
};
const doc = buildOpenApiDocument("/api/v1") as unknown as Doc;

describe("OpenAPI document", () => {
  it("is OpenAPI 3.0.3 using the given server URL", () => {
    expect(doc.openapi).toBe("3.0.3");
    expect(doc.servers).toEqual([{ url: "/api/v1" }]);
    expect(buildOpenApiDocument().servers).toEqual([{ url: "/" }]);
  });

  it("documents every public route", () => {
    expect(Object.keys(doc.paths).sort()).toEqual([
      "/auth/login", "/auth/logout", "/auth/me", "/auth/register",
      "/catalog/inventory", "/catalog/products", "/catalog/warehouses",
      "/dashboard/filters", "/dashboard/summary", "/dashboard/timeseries",
      "/health", "/notifications",
      "/orders", "/orders/{id}", "/orders/{id}/transition",
      "/payments/methods", "/payments/orders/{id}/pay",
    ]);
  });

  it("resolves every $ref to a defined component schema", () => {
    const refs = [...JSON.stringify(doc).matchAll(/#\/components\/schemas\/(\w+)/g)].map((match) => match[1]!);
    expect(refs.length).toBeGreaterThan(10);
    for (const name of new Set(refs)) expect(doc.components.schemas, name).toHaveProperty(name);
  });

  it("gives every operation a tag from the tag list and at least one response", () => {
    const tags = doc.tags.map((tag) => tag.name);
    for (const [path, methods] of Object.entries(doc.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        expect(Object.keys(operation.responses).length, `${method} ${path}`).toBeGreaterThan(0);
        expect(tags, `${method} ${path}`).toEqual(expect.arrayContaining(operation.tags));
      }
    }
  });

  it("protects everything except health, register, login and logout with the session cookie", () => {
    const open = new Set(["/health", "/auth/register", "/auth/login", "/auth/logout"]);
    expect(doc.components.securitySchemes).toHaveProperty("cookieAuth");
    for (const [path, methods] of Object.entries(doc.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (open.has(path)) expect(operation.security, `${method} ${path}`).toBeUndefined();
        else expect(operation.security, `${method} ${path}`).toEqual([{ cookieAuth: [] }]);
      }
    }
  });

  it("is JSON-serialisable", () => {
    expect(() => JSON.parse(JSON.stringify(doc))).not.toThrow();
  });
});
