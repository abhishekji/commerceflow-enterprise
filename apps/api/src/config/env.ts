import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  WEB_ORIGIN: z.string().url().refine((value) => new URL(value).origin === value)
    .default("http://localhost:5173"),
  REDIS_URL: z.string().optional(),
  AWS_REGION: z.string().default("ap-south-1"),
  AWS_SQS_QUEUE_URL: z.string().url().optional(),
  WORKERS_ENABLED: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  SWAGGER_ENABLED: z.enum(["true", "false"]).optional().transform((value) => value === undefined ? undefined : value === "true"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  // API docs are on by default except in production, where they must be enabled explicitly.
  SWAGGER_ENABLED: parsed.SWAGGER_ENABLED ?? parsed.NODE_ENV !== "production",
};
