import { describe, expect, it } from "vitest";
import { newAgent } from "../helpers/factories.js";

describe("Swagger UI (separate URL from the API)", () => {
  it("serves the OpenAPI document as JSON at /api-docs.json", async () => {
    const response = await newAgent().get("/api-docs.json");
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body.openapi).toBe("3.0.3");
    expect(response.body.servers[0].url).toBe("/api/v1");
  });

  it("serves the Swagger UI page at /api-docs with a CSP that permits it to run", async () => {
    const response = await newAgent().get("/api-docs/");
    expect(response.status).toBe(200);
    expect(response.text).toContain("swagger-ui");
    expect(response.headers["content-security-policy"]).toContain("'unsafe-inline'");
  });

  it("keeps the strict default CSP on the API itself", async () => {
    const response = await newAgent().get("/api/v1/health");
    expect(response.headers["content-security-policy"]).toContain("script-src 'self';");
  });
});
