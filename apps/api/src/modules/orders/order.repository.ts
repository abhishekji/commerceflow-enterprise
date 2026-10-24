import type { ClientSession } from "mongoose";
import { Order, type OrderStatus } from "./order.model.js";

export const orderRepository = {
  create(data: Record<string, unknown>, session?: ClientSession) {
    return Order.create([data], { session }).then(
      (orders) => orders[0]
    );
  },

  findById(tenantId: string, orderId: string) {
    return Order.findOne({ _id: orderId, tenantId }).lean();
  },

  async transition(
    tenantId: string,
    orderId: string,
    expectedStatus: OrderStatus,
    nextStatus: OrderStatus,
    session?: ClientSession
  ) {
    return Order.findOneAndUpdate(
      {
        _id: orderId,
        tenantId,
        status: expectedStatus
      },
      {
        $set: { status: nextStatus },
        $inc: { version: 1 }
      },
      { returnDocument: "after", runValidators: true, session }
    );
  }
};