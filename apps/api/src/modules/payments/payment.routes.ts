import { Router } from "express";
import { authenticate, requireTrustedOrigin } from "../../middleware/auth.js";
import { getPaymentMethods, payForOrder } from "./payment.controller.js";

export const paymentRouter = Router();

paymentRouter.get("/methods", authenticate, getPaymentMethods);
paymentRouter.post("/orders/:id/pay", requireTrustedOrigin, authenticate, payForOrder);
