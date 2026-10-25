import express from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";

import { healthRouter } from "./modules/health/health.routes.js";
import { authRouter } from "./modules/identity/auth.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { orderRouter } from "./modules/orders/order.routes.js";
import { catalogRouter } from "./modules/catalog/catalog.routes.js";
import { notificationRouter } from "./modules/notifications/notification.routes.js";
import { paymentRouter } from "./modules/payments/payment.routes.js";
import { aiRouter } from "./modules/ai/ai.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestId } from "./middleware/request-id.js";
import { env } from "./config/env.js";
import { createDocsRouter } from "./docs/swagger.routes.js";

export const app = express();

app.disable("x-powered-by");
if (env.SWAGGER_ENABLED) app.use(createDocsRouter());
app.use(helmet());
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(requestId);
app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp({
  level: env.LOG_LEVEL,
  genReqId: (_request, response) => response.getHeader("X-Request-Id")?.toString() ?? randomUUID(),
  redact: ["req.headers.cookie", "req.headers.authorization"],
}));

app.use("/api/v1/health", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/catalog", catalogRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/ai", aiRouter);

app.use(errorHandler);