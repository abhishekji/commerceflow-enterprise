import { afterEach, describe, expect, it, vi } from "vitest";

// Keep a developer's local .env from leaking into these assertions.
vi.mock("dotenv/config", () => ({}));

const VALID = {
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://localhost:27017/x",
  JWT_SECRET: "a".repeat(32),
};

async function loadEnv(overrides: Record<string, string | undefined> = {}) {
  vi.resetModules();
  const keys = ["NODE_ENV", "PORT", "MONGODB_URI", "JWT_SECRET", "WEB_ORIGIN", "SWAGGER_ENABLED", "WORKERS_ENABLED", "LOG_LEVEL", "AWS_SQS_QUEUE_URL"];
  for (const key of keys) vi.stubEnv(key, undefined as unknown as string);
  for (const [key, value] of Object.entries({ ...VALID, ...overrides })) {
    if (value === undefined) delete process.env[key];
    else vi.stubEnv(key, value);
  }
  return (await import("../../../src/config/env.js")).env;
}

afterEach(() => vi.unstubAllEnvs());

describe("env", () => {
  it("applies defaults", async () => {
    const env = await loadEnv();
    expect(env).toMatchObject({
      PORT: 3000,
      WEB_ORIGIN: "http://localhost:5173",
      AWS_REGION: "ap-south-1",
      WORKERS_ENABLED: true,
      LOG_LEVEL: "info",
    });
  });

  it("coerces PORT and parses boolean flags", async () => {
    const env = await loadEnv({ PORT: "8080", WORKERS_ENABLED: "false" });
    expect(env.PORT).toBe(8080);
    expect(env.WORKERS_ENABLED).toBe(false);
  });

  it("enables Swagger outside production by default, disables it in production, and honours an override", async () => {
    expect((await loadEnv({ NODE_ENV: "development" })).SWAGGER_ENABLED).toBe(true);
    expect((await loadEnv({ NODE_ENV: "production" })).SWAGGER_ENABLED).toBe(false);
    expect((await loadEnv({ NODE_ENV: "production", SWAGGER_ENABLED: "true" })).SWAGGER_ENABLED).toBe(true);
    expect((await loadEnv({ NODE_ENV: "development", SWAGGER_ENABLED: "false" })).SWAGGER_ENABLED).toBe(false);
  });

  it.each([
    ["a short JWT secret", { JWT_SECRET: "short" }],
    ["an empty Mongo URI", { MONGODB_URI: "" }],
    ["a WEB_ORIGIN with a path", { WEB_ORIGIN: "http://localhost:5173/app" }],
    ["an invalid NODE_ENV", { NODE_ENV: "staging" }],
    ["an invalid PORT", { PORT: "-1" }],
    ["an invalid LOG_LEVEL", { LOG_LEVEL: "loud" }],
  ])("fails fast on %s", async (_name, overrides) => {
    await expect(loadEnv(overrides)).rejects.toThrow();
  });
});
