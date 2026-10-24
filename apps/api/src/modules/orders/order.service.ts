import { orderRepository } from "./order.repository.js";
import type { OrderStatus } from "./order.model.js";

export const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["FULFILLING", "CANCELLED"],
  FULFILLING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: []
};

export async function transitionOrder(
  tenantId: string,
  orderId: string,
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
) {
  if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
    throw new Error(
      `Invalid order transition: ${currentStatus} -> ${nextStatus}`
    );
  }

  const updated = await orderRepository.transition(
    tenantId,
    orderId,
    currentStatus,
    nextStatus
  );

  if (!updated) {
    throw new Error(
      "Order not found or changed by another request"
    );
  }

  return updated;
}