import { Schema, model } from "mongoose";

const idempotencyKeySchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    key: { type: String, required: true, trim: true },
    requestHash: { type: String, required: true },
    status: {
      type: String,
      enum: ["IN_PROGRESS", "COMPLETED"],
      required: true,
      default: "IN_PROGRESS",
    },
    responseStatus: { type: Number, min: 100, max: 599, default: null },
    responseBody: { type: Schema.Types.Mixed, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "idempotency_keys" },
);

idempotencyKeySchema.index({ tenantId: 1, key: 1 }, { unique: true });
idempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const IdempotencyKey = model("IdempotencyKey", idempotencyKeySchema);
