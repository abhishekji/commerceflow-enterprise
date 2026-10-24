import { Schema, model } from "mongoose";

const integrationJobSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    provider: { type: String, required: true, trim: true },
    operation: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "DEAD_LETTER"],
      required: true,
      default: "QUEUED",
    },
    payload: { type: Schema.Types.Mixed, required: true },
    result: { type: Schema.Types.Mixed, default: null },
    attemptCount: { type: Number, required: true, min: 0, default: 0 },
    maxAttempts: { type: Number, required: true, min: 1, default: 5 },
    scheduledAt: { type: Date, required: true, default: Date.now },
    lockedUntil: { type: Date, default: null },
    idempotencyKey: { type: String, trim: true, default: null },
    lastError: { type: String, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "integration_jobs" },
);

integrationJobSchema.index({ status: 1, scheduledAt: 1 });
integrationJobSchema.index({
  tenantId: 1,
  provider: 1,
  status: 1,
  createdAt: -1,
});
integrationJobSchema.index(
  { tenantId: 1, provider: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  },
);

export const IntegrationJob = model("IntegrationJob", integrationJobSchema);
