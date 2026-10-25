import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
let configured = true;
vi.mock("../../src/modules/ai/openai.client.js", () => ({
  getOpenAI: () => (configured ? { chat: { completions: { create } } } : null),
}));

import { connectTestDb, disconnectTestDb } from "../helpers/db.js";
import { createSignedInUser, newAgent, registerTenant, seedCatalog } from "../helpers/factories.js";

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(() => {
  configured = true;
  create.mockReset();
  create.mockResolvedValue({ choices: [{ message: { content: " Hello there " } }] });
});

const API = "/api/v1/ai";
const ask = (content = "What is in stock?") => ({ messages: [{ role: "user", content }] });

describe("AI assistant", () => {
  it("requires a session", async () => {
    expect((await newAgent().post(`${API}/chat`).send(ask())).status).toBe(401);
    expect((await newAgent().post(`${API}/insights`).send({})).status).toBe(401);
  });

  it("answers chat with tenant data in the system prompt and no cross-tenant leakage", async () => {
    const tenant = await registerTenant();
    await seedCatalog(tenant, { sku: "SKU-MINE" });
    const other = await registerTenant();
    await seedCatalog(other, { sku: "SKU-OTHER" });

    const response = await tenant.admin.post(`${API}/chat`).send(ask());
    expect(response.status).toBe(200);
    expect(response.body.data.reply).toBe("Hello there");

    const prompt = create.mock.calls[0]![0].messages[0].content as string;
    expect(prompt).toContain("SKU-MINE");
    expect(prompt).not.toContain("SKU-OTHER");
    expect(prompt).toContain("dashboard");
  });

  it("keeps operational metrics away from customers and blocks them from insights", async () => {
    const tenant = await registerTenant();
    const { agent } = await createSignedInUser(tenant, "CUSTOMER");

    expect((await agent.post(`${API}/chat`).send(ask())).status).toBe(200);
    expect(create.mock.calls[0]![0].messages[0].content).not.toContain('"dashboard"');
    expect((await agent.post(`${API}/insights`).send({})).status).toBe(403);
  });

  it("generates dashboard insights", async () => {
    const tenant = await registerTenant();
    const response = await tenant.admin.post(`${API}/insights`).send({});
    expect(response.status).toBe(200);
    expect(response.body.data.insights).toBe("Hello there");
  });

  it("validates chat input", async () => {
    const tenant = await registerTenant();
    expect((await tenant.admin.post(`${API}/chat`).send({ messages: [] })).status).toBe(400);
    expect((await tenant.admin.post(`${API}/chat`).send({ messages: [{ role: "assistant", content: "hi" }] })).status).toBe(400);
    expect((await tenant.admin.post(`${API}/chat`).send(ask("x".repeat(2001)))).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 503 when no API key is configured", async () => {
    configured = false;
    const tenant = await registerTenant();
    const response = await tenant.admin.post(`${API}/chat`).send(ask());
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("AI_NOT_CONFIGURED");
  });

  it("rate limits bursts per user", async () => {
    const tenant = await registerTenant();
    let last = 200;
    for (let i = 0; i < 16; i += 1) last = (await tenant.admin.post(`${API}/chat`).send(ask())).status;
    expect(last).toBe(429);
  });
});
