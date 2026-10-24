import mongoose, { Types } from "mongoose";
import { Inventory } from "../catalog/inventory/inventory.model.js";
import { Product } from "../catalog/product.model.js";
import { Warehouse } from "../warehouses/warehouse.model.js";
import { Order } from "./order.model.js";
import { OutboxEvent } from "../events/outbox-event.model.js";
import { AuditLog } from "../audit/audit-log.model.js";

interface CheckoutItem {
  productId: string;
  quantity: number;
}

function checkoutError(statusCode: number, code: string) {
  return Object.assign(new Error(code), { statusCode, code });
}

export async function checkout(
  tenantId: string,
  customerId: string,
  warehouseId: string,
  items: CheckoutItem[],
) {
  const tenantObjectId = new Types.ObjectId(tenantId);
  const warehouseObjectId = new Types.ObjectId(warehouseId);
  const productIds = items.map((item) => new Types.ObjectId(item.productId));
  const session = await mongoose.startSession();

  try {
    let createdOrder: mongoose.HydratedDocument<unknown> | undefined;
    await session.withTransaction(async () => {
      const warehouse = await Warehouse.exists({
        _id: warehouseObjectId,
        tenantId: tenantObjectId,
        active: true,
      }).session(session);
      if (!warehouse) throw checkoutError(404, "WAREHOUSE_NOT_FOUND");

      const products = await Product.find({
        _id: { $in: productIds },
        tenantId: tenantObjectId,
        active: true,
      })
        .session(session)
        .lean();
      const productById = new Map(products.map((product) => [product._id.toString(), product]));
      if (productById.size !== new Set(items.map((item) => item.productId)).size) {
        throw checkoutError(400, "PRODUCT_NOT_FOUND_OR_INACTIVE");
      }

      const currencies = new Set(products.map((product) => product.currency));
      if (currencies.size !== 1) throw checkoutError(400, "MIXED_CURRENCIES");

      const orderItems = [];
      let totalMinor = 0;
      for (const item of items) {
        const product = productById.get(item.productId);
        if (!product) throw checkoutError(400, "PRODUCT_NOT_FOUND_OR_INACTIVE");
        const unitPriceMinor = Math.round(product.price * 100);
        totalMinor += unitPriceMinor * item.quantity;
        if (!Number.isSafeInteger(totalMinor)) throw checkoutError(400, "ORDER_TOTAL_TOO_LARGE");

        const inventoryUpdate = await Inventory.updateOne(
          {
            tenantId: tenantObjectId,
            warehouseId: warehouseObjectId,
            productId: product._id,
            $expr: { $gte: [{ $subtract: ["$available", "$reserved"] }, item.quantity] },
          },
          { $inc: { reserved: item.quantity } },
          { session },
        );
        if (inventoryUpdate.modifiedCount !== 1) {
          throw checkoutError(409, "INSUFFICIENT_INVENTORY");
        }

        orderItems.push({
          productId: product._id,
          sku: product.sku,
          name: product.name,
          quantity: item.quantity,
          unitPriceMinor,
        });
      }

      const orders = await Order.create(
        [
          {
            tenantId: tenantObjectId,
            customerId: new Types.ObjectId(customerId),
            warehouseId: warehouseObjectId,
            status: "PENDING",
            items: orderItems,
            totalMinor,
            currency: [...currencies][0],
          },
        ],
        { session },
      );
      createdOrder = orders[0];
      const order = orders[0]!;

      // Written in the same transaction as the order so the event cannot be lost or sent for a rolled-back order.
      await OutboxEvent.create(
        [
          {
            tenantId: tenantObjectId,
            aggregateType: "Order",
            aggregateId: order._id,
            eventType: "order.created",
            payload: {
              orderId: order._id.toString(),
              customerId,
              totalMinor,
              currency: [...currencies][0],
            },
          },
        ],
        { session },
      );
      await AuditLog.create(
        [
          {
            tenantId: tenantObjectId,
            actorType: "USER",
            actorId: new Types.ObjectId(customerId),
            action: "order.created",
            resourceType: "Order",
            resourceId: order._id,
            metadata: { totalMinor, itemCount: orderItems.length },
          },
        ],
        { session },
      );
    });

    if (!createdOrder) throw new Error("Checkout transaction completed without an order");
    return createdOrder;
  } finally {
    await session.endSession();
  }
}
