import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest, jsonBody } from "./apiClient";

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => (body === undefined ? Promise.reject(new Error("no body")) : Promise.resolve(body)),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("apiRequest", () => {
  it("returns the data envelope and sends credentials", async () => {
    const fetchMock = mockFetch(200, { data: { ok: true } });
    await expect(apiRequest("/health")).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ credentials: "include" });
  });

  it("adds a JSON content type only when a body is sent", async () => {
    const fetchMock = mockFetch(200, { data: null });
    await apiRequest("/x", { method: "POST", ...jsonBody({ a: 1 }) });
    expect(fetchMock.mock.calls[0]![1].headers).toEqual({ "Content-Type": "application/json" });
    expect(fetchMock.mock.calls[0]![1].body).toBe('{"a":1}');
  });

  it("returns null for 204 responses", async () => {
    mockFetch(204, undefined);
    await expect(apiRequest("/logout", { method: "POST" })).resolves.toBeNull();
  });

  it("throws an ApiError carrying the status and error code", async () => {
    mockFetch(409, { error: { code: "ALREADY_PAID" } });
    await expect(apiRequest("/pay")).rejects.toMatchObject({ status: 409, code: "ALREADY_PAID" });
    await expect(apiRequest("/pay")).rejects.toBeInstanceOf(ApiError);
  });

  it("still throws an ApiError when the error body is not JSON", async () => {
    mockFetch(500, undefined);
    await expect(apiRequest("/boom")).rejects.toMatchObject({ status: 500, code: undefined });
  });
});
