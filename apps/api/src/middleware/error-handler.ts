import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: { code: "VALIDATION_ERROR" } });
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    response.status(400).json({ error: { code: "INVALID_IDENTIFIER" } });
    return;
  }

  const reportedStatus =
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
      ? error.statusCode
      : typeof error === "object" &&
          error !== null &&
          "status" in error &&
          typeof error.status === "number"
        ? error.status
        : 500;
  const statusCode = reportedStatus >= 400 && reportedStatus < 500 ? reportedStatus : 500;
  const reportedCode =
    typeof error === "object" && error !== null && "code" in error &&
    typeof error.code === "string"
      ? error.code
      : undefined;
  const code =
    statusCode >= 500
      ? "INTERNAL_SERVER_ERROR"
      : statusCode === 413
        ? "PAYLOAD_TOO_LARGE"
        : reportedCode ?? "BAD_REQUEST";

  if (statusCode >= 500) {
    request.log.error({ err: error }, "Request failed");
  }

  response.status(statusCode).json({
    error: { code },
    requestId: response.locals.requestId,
  });
};
