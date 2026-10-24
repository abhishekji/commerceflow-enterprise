import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestId(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const id = randomUUID();
  response.setHeader("X-Request-Id", id);
  response.locals.requestId = id;
  next();
}
