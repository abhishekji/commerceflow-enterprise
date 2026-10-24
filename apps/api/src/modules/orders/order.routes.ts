import { Router } from "express";
import { authenticate, requireTrustedOrigin } from "../../middleware/auth.js";
import { createOrder, getOrderById, getOrders, transitionOrderStatus } from "./order.controller.js";

export const orderRouter = Router();

orderRouter.get("/", authenticate, getOrders);
orderRouter.get("/:id", authenticate, getOrderById);
orderRouter.post("/", requireTrustedOrigin, authenticate, createOrder);
orderRouter.post("/:id/transition", requireTrustedOrigin, authenticate, transitionOrderStatus);
