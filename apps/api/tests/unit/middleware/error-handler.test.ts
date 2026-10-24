import { Buffer } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { ZodError, z } from "zod";
import { errorHandler } from "../../../src/middleware/error-handler.js";

function run(error: unknown) {
  const response = {
    locals: { requestId: "req-1" },
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const request = { log: { error: vi.fn() } };
  errorHandler(error, request as never, response as never, vi.fn());
  return { response, request };
}

describe("errorHandler", () => {
  it("maps ZodError to 400 VALIDATION_ERROR", () => {
    const parsed = z.object({ a: z.string() }).safeParse({});
    const { response } = run(parsed.error as ZodError);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: { code: "VALIDATION_ERROR" } });
  });

  it("maps a Mongoose CastError to 400 INVALID_IDENTIFIER", () => {
    const { response } = run(new mongoose.Error.CastError("ObjectId", "x", "_id"));
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: { code: "INVALID_IDENTIFIER" } });
  });

  it.each([
    ["statusCode", { statusCode: 409, code: "TAKEN" }, 409, "TAKEN"],
    ["status", { status: 404, code: "NOPE" }, 404, "NOPE"],
    ["no code", { statusCode: 422 }, 422, "BAD_REQUEST"],
    ["payload too large", { status: 413, code: "ignored" }, 413, "PAYLOAD_TOO_LARGE"],
  ])("passes through client errors (%s) with the request id", (_name, error, status, code) => {
    const { response, request } = run(error);
    expect(response.status).toHaveBeenCalledWith(status);
    expect(response.json).toHaveBeenCalledWith({ error: { code }, requestId: "req-1" });
    expect(request.log.error).not.toHaveBeenCalled();
  });

  it.each([
    ["an unknown Error", new Error("secret db password leaked")],
    ["a 5xx status", { statusCode: 503, code: "DB_DOWN" }],
    ["a non-4xx status", { status: 302 }],
    ["a thrown string", "boom"],
    ["null", null],
  ])("hides details and logs for %s", (_name, error) => {
    const { response, request } = run(error);
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: { code: "INTERNAL_SERVER_ERROR" }, requestId: "req-1" });
    expect(JSON.stringify(response.json.mock.calls)).not.toContain("secret");
    expect(request.log.error).toHaveBeenCalledOnce();
  });

  it("is usable with Buffers in messages without throwing", () => {
    expect(() => run(Object.assign(new Error(Buffer.from("x").toString()), { status: 400 }))).not.toThrow();
  });
});
