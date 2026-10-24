import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { Order } from "../orders/order.model.js";
import { serializeOrders } from "../orders/order.queries.js";
import { netBankingBanks, payOrder, payOrderSchema, wallets } from "./payment.service.js";

const orderIdSchema = z.string().regex(/^[a-f\d]{24}$/i);

export function getPaymentMethods(_req: Request, res: Response) {
  res.json({
    data: {
      methods: ["CARD", "UPI", "NET_BANKING", "WALLET", "COD"],
      banks: netBankingBanks,
      wallets,
      sandbox: true,
      testHints: {
        cardSuccess: "4242 4242 4242 4242",
        cardDeclined: "4000 0000 0000 0002",
        upiDeclined: "Any UPI ID starting with 'fail'",
      },
    },
  });
}

export async function payForOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = orderIdSchema.parse(req.params.id);
    const payment = payOrderSchema.parse(req.body);
    const { tenantId, userId } = req.auth!;

    const result = await payOrder({ tenantId, userId, orderId, payment, requestId: res.locals.requestId });

    const order = await Order.findOne({ _id: orderId, tenantId }).lean();
    const [serialized] = await serializeOrders(tenantId, [order!]);
    res.json({ data: { order: serialized, reference: result.reference } });
  } catch (error) {
    next(error);
  }
}
