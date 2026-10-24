import { Schema, model } from "mongoose";

export const orderStatuses = [
  "PENDING",
  "CONFIRMED",
  "FULFILLING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

// COD = pay on delivery (accepted, cash not yet collected); PAID also covers COD once collected.
export const paymentStatuses = ["UNPAID", "PAID", "COD", "REFUNDED"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

const orderItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPriceMinor: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    status: {
      type: String,
      enum: orderStatuses,
      default: "PENDING",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
    },
    totalMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    paymentStatus: { type: String, enum: paymentStatuses, default: "UNPAID", required: true },
    paymentMethod: { type: String, default: null },
    paymentReference: { type: String, default: null },
    paymentSummary: { type: String, default: null },
    paidAt: { type: Date, default: null },
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

orderSchema.index({ tenantId: 1, createdAt: -1 });
orderSchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });
orderSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
orderSchema.index({ tenantId: 1, warehouseId: 1, createdAt: -1 });

export const Order = model("Order", orderSchema);
