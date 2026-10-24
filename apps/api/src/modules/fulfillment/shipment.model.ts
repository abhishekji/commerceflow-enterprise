import { Schema, model } from "mongoose";

export const shipmentStatuses = [
  "REQUESTED",
  "PACKING",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
] as const;

const shipmentEventSchema = new Schema(
  {
    status: { type: String, enum: shipmentStatuses, required: true },
    note: { type: String, default: "" },
    at: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const shipmentSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    carrier: { type: String, required: true },
    trackingNumber: { type: String, required: true },
    status: { type: String, enum: shipmentStatuses, required: true, default: "REQUESTED" },
    events: { type: [shipmentEventSchema], default: [] },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "shipments" },
);

shipmentSchema.index({ tenantId: 1, orderId: 1 }, { unique: true });
shipmentSchema.index({ tenantId: 1, trackingNumber: 1 }, { unique: true });

export const Shipment = model("Shipment", shipmentSchema);
