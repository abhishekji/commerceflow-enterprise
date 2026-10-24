import { Schema, model } from "mongoose";

export const paymentMethods = ["CARD", "UPI", "NET_BANKING", "WALLET", "COD"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const paymentRecordStatuses = ["SUCCEEDED", "FAILED", "PENDING_COD", "REFUNDED"] as const;

// Only masked instrument details are stored; card numbers and CVVs are never persisted.
const paymentSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    method: { type: String, enum: paymentMethods, required: true },
    status: { type: String, enum: paymentRecordStatuses, required: true },
    amountMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    reference: { type: String, required: true, unique: true },
    instrument: { type: String, default: null },
    failureReason: { type: String, default: null },
    refundedAt: { type: Date, default: null },
    refundReference: { type: String, default: null },
  },
  { timestamps: true },
);

paymentSchema.index({ tenantId: 1, orderId: 1, createdAt: -1 });

export const Payment = model("Payment", paymentSchema);
