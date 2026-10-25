import OpenAI from "openai";
import { env } from "../../config/env.js";

let client: OpenAI | null = null;

/** Returns null when OPENAI_API_KEY is not configured, so the AI endpoints can degrade gracefully. */
export function getOpenAI(): OpenAI | null {
  if (!env.OPENAI_API_KEY) return null;
  client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 30_000, maxRetries: 1 });
  return client;
}
