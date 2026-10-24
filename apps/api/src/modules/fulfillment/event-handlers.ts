import { Types } from "mongoose";
import type { DomainMessage } from "../../messaging/message-bus.js";
import { Notification } from "../notifications/notification.model.js";
import { Order } from "../orders/order.model.js";
import { changeOrderStatus } from "./fulfillment.service.js";

function isDuplicateKeyError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

async function notify(message: DomainMessage, userId: string, type: string, text: string) {
  try {
    await Notification.create({
      tenantId: new Types.ObjectId(message.tenantId),
      userId: new Types.ObjectId(userId),
      orderId: new Types.ObjectId(message.aggregateId),
      type,
      message: text,
      // One notification per event, so redelivered messages do not notify twice.
      dedupeKey: message.eventId,
    });
    console.info(`[notification:${type}] user=${userId} order=${message.aggregateId}: ${text}`);
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
  }
}

const statusMessages: Record<string, string> = {
  CONFIRMED: "has been confirmed and a shipment was requested.",
  FULFILLING: "is being packed.",
  SHIPPED: "has shipped.",
  DELIVERED: "was delivered.",
  CANCELLED: "was cancelled.",
};

function label(orderId: string) {
  return `Order #${orderId.slice(-6).toUpperCase()}`;
}

/** Idempotent handler for domain events consumed from the queue. */
export async function handleDomainMessage(message: DomainMessage) {
  const customerId = String(message.payload.customerId ?? "");
  if (!customerId) return;

  if (message.eventType === "order.created") {
    await notify(
      message,
      customerId,
      "ORDER_RECEIVED",
      `${label(message.aggregateId)} was received and is awaiting payment.`,
    );
    return;
  }

  if (message.eventType === "payment.succeeded") {
    const cod = message.payload.cashOnDelivery === true;
    await notify(
      message,
      customerId,
      "PAYMENT_RECEIVED",
      cod
        ? `${label(message.aggregateId)} will be paid on delivery.`
        : `Payment received for ${label(message.aggregateId)} (ref ${String(message.payload.reference ?? "")}).`,
    );
    const order = await Order.findOne({ _id: message.aggregateId, tenantId: message.tenantId })
      .select("status")
      .lean();
    if (order?.status === "PENDING") {
      try {
        await changeOrderStatus({
          tenantId: message.tenantId,
          orderId: message.aggregateId,
          next: "CONFIRMED",
          actor: { type: "SYSTEM" },
        });
      } catch (error) {
        // A concurrent change (for example a cancellation) already moved the order on.
        const code = (error as { code?: string }).code;
        if (code !== "ORDER_CHANGED" && code !== "INVALID_ORDER_TRANSITION") throw error;
      }
    }
    return;
  }

  if (message.eventType === "order.status_changed") {
    const to = String(message.payload.to ?? "");
    const text = statusMessages[to];
    if (text) {
      const refund = to === "CANCELLED" && message.payload.refunded === true ? " Your payment was refunded." : "";
      await notify(message, customerId, `ORDER_${to}`, `${label(message.aggregateId)} ${text}${refund}`);
    }
  }
}
