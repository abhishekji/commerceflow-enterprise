import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { createOrderSchema } from "./order.schema.js";
import { checkout } from "./checkout.service.js";
import { Order, orderStatuses } from "./order.model.js";
import { listOrders, serializeOrders } from "./order.queries.js";
import { changeOrderStatus, statusError } from "../fulfillment/fulfillment.service.js";

export async function createOrder(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const input = createOrderSchema.parse(req.body);

    const { tenantId, userId } = req.auth!;

    const order = await checkout(
      tenantId,
      userId,
      input.warehouseId,
      input.items
    );

    const [serialized] = await serializeOrders(tenantId, [order.toObject()]);
    res.status(201).json({
      data: serialized
    });
  } catch (error) {
    next(error);
  }
}

const listQuerySchema = z.object({
  status: z.enum(orderStatuses).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function getOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listQuerySchema.parse(req.query);
    const { tenantId, userId, role } = req.auth!;
    const orders = await listOrders(tenantId, {
      ...query,
      customerId: role === "CUSTOMER" ? userId : undefined,
    });
    res.json({ data: orders });
  } catch (error) {
    next(error);
  }
}

const transitionSchema = z.object({ status: z.enum(orderStatuses) });
const orderIdSchema = z.string().regex(/^[a-f\d]{24}$/i);

export async function getOrderById(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = orderIdSchema.parse(req.params.id);
    const { tenantId, userId, role } = req.auth!;
    const order = await Order.findOne({
      _id: orderId,
      tenantId,
      ...(role === "CUSTOMER" ? { customerId: userId } : {}),
    } as Record<string, unknown>).lean();
    if (!order) throw statusError(404, "ORDER_NOT_FOUND");
    const [serialized] = await serializeOrders(tenantId, [order]);
    res.json({ data: serialized });
  } catch (error) {
    next(error);
  }
}

export async function transitionOrderStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = orderIdSchema.parse(req.params.id);
    const { status } = transitionSchema.parse(req.body);
    const { tenantId, userId, role } = req.auth!;

    if (role === "CUSTOMER") {
      // Customers may only cancel their own order before fulfillment starts.
      const own = await Order.findOne({ _id: orderId, tenantId, customerId: userId })
        .select("status")
        .lean();
      if (!own) throw statusError(404, "ORDER_NOT_FOUND");
      if (status !== "CANCELLED" || !["PENDING", "CONFIRMED"].includes(own.status)) {
        throw statusError(403, "FORBIDDEN");
      }
    }

    await changeOrderStatus({
      tenantId,
      orderId,
      next: status,
      actor: { type: "USER", id: userId, requestId: res.locals.requestId },
    });

    const order = await Order.findOne({ _id: orderId, tenantId }).lean();
    const [serialized] = await serializeOrders(tenantId, [order!]);
    res.json({ data: serialized });
  } catch (error) {
    next(error);
  }
}
