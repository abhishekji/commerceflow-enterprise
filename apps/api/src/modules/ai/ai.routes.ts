import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { authenticate, requireDashboardRole, requireTrustedOrigin } from "../../middleware/auth.js";
import { AiUnavailableError, chatWithAssistant, generateInsights } from "./ai.service.js";

export const aiRouter = Router();

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 15;
const hits = new Map<string, number[]>();

/** Per-user in-memory limit: each call costs money, so cap bursts. */
function rateLimit(request: Request, response: Response, next: NextFunction) {
  const key = request.auth!.userId;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    response.status(429).json({ error: { code: "AI_RATE_LIMITED" } });
    return;
  }
  recent.push(now);
  hits.set(key, recent);
  next();
}

type Handler = (request: Request, response: Response) => Promise<void>;
const handle = (handler: Handler) => (request: Request, response: Response, next: NextFunction) => {
  handler(request, response).catch((error: unknown) => {
    if (error instanceof AiUnavailableError) {
      response.status(503).json({ error: { code: "AI_NOT_CONFIGURED" } });
      return;
    }
    if (error instanceof OpenAI.APIError) {
      request.log.error({ err: error }, "OpenAI request failed");
      response.status(502).json({ error: { code: "AI_UPSTREAM_ERROR" } });
      return;
    }
    next(error);
  });
};

const chatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(20)
    .refine((messages) => messages[messages.length - 1]?.role === "user"),
});

aiRouter.post("/chat", requireTrustedOrigin, authenticate, rateLimit, handle(async (request, response) => {
  const { messages } = chatSchema.parse(request.body);
  response.json({ data: { reply: await chatWithAssistant(request.auth!, messages) } });
}));

const insightsSchema = z.object({ warehouseId: z.string().regex(/^[a-f\d]{24}$/i).optional() });

aiRouter.post("/insights", requireTrustedOrigin, authenticate, requireDashboardRole, rateLimit, handle(async (request, response) => {
  const { warehouseId } = insightsSchema.parse(request.body ?? {});
  response.json({ data: { insights: await generateInsights(request.auth!, warehouseId) } });
}));
