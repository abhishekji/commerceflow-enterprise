import { OrderStatus, PaymentStatus } from "../enums";
import type { OrderAction } from "../types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: "Pending",
  [OrderStatus.Confirmed]: "Confirmed",
  [OrderStatus.Fulfilling]: "Packing",
  [OrderStatus.Shipped]: "Shipped",
  [OrderStatus.Delivered]: "Delivered",
  [OrderStatus.Cancelled]: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.Unpaid]: "Awaiting payment",
  [PaymentStatus.Paid]: "Paid",
  [PaymentStatus.CashOnDelivery]: "Pay on delivery",
  [PaymentStatus.Refunded]: "Refunded",
};

export const STAFF_ORDER_ACTIONS: Partial<Record<OrderStatus, OrderAction[]>> = {
  [OrderStatus.Pending]: [[OrderStatus.Confirmed, "Confirm"], [OrderStatus.Cancelled, "Cancel"]],
  [OrderStatus.Confirmed]: [[OrderStatus.Fulfilling, "Start packing"], [OrderStatus.Cancelled, "Cancel"]],
  [OrderStatus.Fulfilling]: [[OrderStatus.Shipped, "Mark shipped"], [OrderStatus.Cancelled, "Cancel"]],
  [OrderStatus.Shipped]: [[OrderStatus.Delivered, "Mark delivered"]],
};

export const CUSTOMER_ORDER_ACTIONS: Partial<Record<OrderStatus, OrderAction[]>> = {
  [OrderStatus.Pending]: [[OrderStatus.Cancelled, "Cancel"]],
  [OrderStatus.Confirmed]: [[OrderStatus.Cancelled, "Cancel"]],
};

export const MAX_LINE_QUANTITY = 100;
