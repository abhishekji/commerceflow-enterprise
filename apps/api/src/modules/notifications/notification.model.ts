import { Schema, model } from "mongoose";

const notificationSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    channel: { type: String, enum: ["IN_APP"], required: true, default: "IN_APP" },
    type: { type: String, required: true },
    message: { type: String, required: true },
    dedupeKey: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "notifications" },
);

notificationSchema.index({ tenantId: 1, dedupeKey: 1 }, { unique: true });
notificationSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });

export const Notification = model("Notification", notificationSchema);
