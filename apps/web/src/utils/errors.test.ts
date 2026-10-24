import { describe, expect, it } from "vitest";
import { ApiErrorCode } from "../common/enums";
import { DEFAULT_ERROR_MESSAGE, ERROR_MESSAGES } from "../common/constants";
import { ApiError } from "./apiClient";
import { errorMessage, errorStatus } from "./errors";

describe("errors utils", () => {
  it("maps known API error codes to friendly messages", () => {
    const error = new ApiError(402, ApiErrorCode.PaymentDeclined);
    expect(errorMessage(error)).toBe(ERROR_MESSAGES[ApiErrorCode.PaymentDeclined]);
  });

  it("falls back to the default message for unknown codes and non-errors", () => {
    expect(errorMessage(new ApiError(500, "SOMETHING_NEW"))).toBe(DEFAULT_ERROR_MESSAGE);
    expect(errorMessage(null)).toBe(DEFAULT_ERROR_MESSAGE);
  });

  it("reads the HTTP status when present", () => {
    expect(errorStatus(new ApiError(401))).toBe(401);
    expect(errorStatus(new Error("x"))).toBeUndefined();
  });
});
