import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ readyState: 1 }));
vi.mock("mongoose", () => ({
  default: {
    connection: {
      get readyState() {
        return state.readyState;
      },
    },
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  },
}));

import mongoose from "mongoose";
import { connectMongoDB, disconnectMongoDB } from "../../../src/infrastructure/database/mongo.js";
import { env } from "../../../src/config/env.js";
import { healthRouter } from "../../../src/modules/health/health.routes.js";

function callHealth() {
  const response = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  const layer = (healthRouter as unknown as { stack: { route: { stack: { handle: (...args: unknown[]) => void }[] } }[] }).stack[0]!;
  layer.route.stack[0]!.handle({}, response);
  return response;
}

describe("health route", () => {
  it("returns 200 UP when connected and 503 DOWN otherwise", () => {
    state.readyState = 1;
    const up = callHealth();
    expect(up.status).toHaveBeenCalledWith(200);
    expect(up.json).toHaveBeenCalledWith({ status: "UP", database: "CONNECTED" });

    state.readyState = 0;
    const down = callHealth();
    expect(down.status).toHaveBeenCalledWith(503);
    expect(down.json).toHaveBeenCalledWith({ status: "DOWN", database: "DISCONNECTED" });
  });
});

describe("mongo connection helpers", () => {
  it("connects with the configured URI and a bounded server selection timeout", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    await connectMongoDB();
    expect(mongoose.connect).toHaveBeenCalledWith(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  });

  it("disconnects", async () => {
    await disconnectMongoDB();
    expect(mongoose.disconnect).toHaveBeenCalledOnce();
  });
});
