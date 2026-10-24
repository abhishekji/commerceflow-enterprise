import { randomBytes } from "node:crypto";
import mongoose, { Types } from "mongoose";
import { Inventory } from "../catalog/inventory/inventory.model.js";
import { AuditLog } from "../audit/audit-log.model.js";
import { OutboxEvent } from "../events/outbox-event.model.js";
import { IntegrationJob } from "../integrations/integration-job.model.js";
import { Order, type OrderStatus } from "../orders/order.model.js";
import { Payment } from "../payments/payment.model.js";
import { allowedTransitions } from "../orders/order.service.js";
import { orderRepository } from "../orders/order.repository.js";
import { Shipment, shipmentStatuses } from "./shipment.model.js";

export interface Actor {
  type: "USER" | "SYSTEM";
  id?: string;
  requestId?: string;
}

const CARRIER = "SIMULATED-EXPRESS";

const shipmentStatusFor: Partial<Record<OrderStatus, (typeof shipmentStatuses)[number]>> = {
  FULFILLING: "PACKING",
  SHIPPED: "IN_TRANSIT",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
};

const shipmentNote: Partial<Record<OrderStatus, string>> = {
  FULFILLING: "Order is being picked and packed",
  SHIPPED: "Shipment handed to the carrier",
  DELIVERED: "Shipment delivered to the customer",
  CANCELLED: "Shipment cancelled",
};

export function statusError(statusCode: number, code: string) {
  return Object.assign(new Error(code), { statusCode, code });
}

function newTrackingNumber() {
  return `CF${randomBytes(5).toString("hex").toUpperCase()}`;
}

export async function changeOrderStatus(input: {
  tenantId: string;
  orderId: string;
  next: OrderStatus;
  actor: Actor;
}) {
  const { tenantId, orderId, next, actor } = input;
  const tenantObjectId = new Types.ObjectId(tenantId);
  const session = await mongoose.startSession();

  try {
    let outcome: { orderId: string; from: OrderStatus; to: OrderStatus } | undefined;

    await session.withTransaction(async () => {
      const order = await Order.findOne({ _id: orderId, tenantId: tenantObjectId }).session(session);
      if (!order) throw statusError(404, "ORDER_NOT_FOUND");

      const from = order.status as OrderStatus;
      if (!allowedTransitions[from]?.includes(next)) {
        throw statusError(409, "INVALID_ORDER_TRANSITION");
      }
      // An order can only be confirmed once it is paid (or the customer chose pay-on-delivery).
      if (next === "CONFIRMED" && order.paymentStatus === "UNPAID") {
        throw statusError(409, "PAYMENT_REQUIRED");
      }
      const updated = await orderRepository.transition(tenantId, orderId, from, next, session);
      if (!updated) throw statusError(409, "ORDER_CHANGED");

      let refunded = false;
      if (next === "CANCELLED" && order.paymentStatus === "PAID") {
        // Dummy refund: no money moved, but the order and payment records reflect it.
        const refundReference = `REF-${randomBytes(6).toString("hex").toUpperCase()}`;
        await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: "REFUNDED" } }, { session });
        await Payment.updateOne(
          { tenantId: tenantObjectId, orderId: order._id, status: "SUCCEEDED" },
          { $set: { status: "REFUNDED", refundedAt: new Date(), refundReference } },
          { session },
        );
        refunded = true;
      } else if (next === "DELIVERED" && order.paymentStatus === "COD") {
        await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: "PAID", paidAt: new Date() } }, { session });
        await Payment.updateOne(
          { tenantId: tenantObjectId, orderId: order._id, status: "PENDING_COD" },
          { $set: { status: "SUCCEEDED" } },
          { session },
        );
      }

      for (const item of order.items) {
        const key = {
          tenantId: tenantObjectId,
          warehouseId: order.warehouseId,
          productId: item.productId,
          reserved: { $gte: item.quantity },
        };
        if (next === "SHIPPED") {
          const result = await Inventory.updateOne(
            key,
            { $inc: { available: -item.quantity, reserved: -item.quantity } },
            { session },
          );
          if (result.modifiedCount !== 1) throw statusError(409, "INVENTORY_RESERVATION_MISSING");
        } else if (next === "CANCELLED") {
          const result = await Inventory.updateOne(
            key,
            { $inc: { reserved: -item.quantity } },
            { session },
          );
          if (result.modifiedCount !== 1) throw statusError(409, "INVENTORY_RESERVATION_MISSING");
        }
      }

      if (next === "CONFIRMED") {
        const trackingNumber = newTrackingNumber();
        await Shipment.create(
          [
            {
              tenantId: tenantObjectId,
              orderId: order._id,
              carrier: CARRIER,
              trackingNumber,
              status: "REQUESTED",
              events: [{ status: "REQUESTED", note: "Shipment requested from carrier" }],
            },
          ],
          { session },
        );
        // Stand-in for a real carrier API call; recorded so the integration is traceable and idempotent.
        await IntegrationJob.create(
          [
            {
              tenantId: tenantObjectId,
              provider: CARRIER,
              operation: "CREATE_SHIPMENT",
              status: "SUCCEEDED",
              payload: { orderId },
              result: { trackingNumber },
              attemptCount: 1,
              idempotencyKey: `shipment:${orderId}`,
              completedAt: new Date(),
            },
          ],
          { session },
        );
      } else {
        const shipmentStatus = shipmentStatusFor[next];
        if (shipmentStatus) {
          const now = new Date();
          await Shipment.updateOne(
            { tenantId: tenantObjectId, orderId: order._id },
            {
              $set: {
                status: shipmentStatus,
                ...(next === "SHIPPED" ? { shippedAt: now } : {}),
                ...(next === "DELIVERED" ? { deliveredAt: now } : {}),
              },
              $push: { events: { status: shipmentStatus, note: shipmentNote[next] ?? "", at: now } },
            },
            { session },
          );
        }
      }

      await OutboxEvent.create(
        [
          {
            tenantId: tenantObjectId,
            aggregateType: "Order",
            aggregateId: order._id,
            eventType: "order.status_changed",
            payload: {
              orderId,
              customerId: order.customerId.toString(),
              from,
              to: next,
              refunded,
            },
          },
        ],
        { session },
      );
      await AuditLog.create(
        [
          {
            tenantId: tenantObjectId,
            actorType: actor.type,
            actorId: actor.id ? new Types.ObjectId(actor.id) : null,
            action: `order.status.${next.toLowerCase()}`,
            resourceType: "Order",
            resourceId: order._id,
            requestId: actor.requestId ?? null,
            metadata: { from, to: next, refunded },
          },
        ],
        { session },
      );

      outcome = { orderId, from, to: next };
    });

    if (!outcome) throw new Error("Status transaction completed without a result");
    return outcome;
  } finally {
    await session.endSession();
  }
}
