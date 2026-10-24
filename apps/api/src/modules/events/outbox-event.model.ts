import { randomUUID } from "node:crypto";
import { Schema, model } from "mongoose";

const outboxEventSchema = new Schema(
  {
    eventId: {
      type: String,
      required: true,
      default: randomUUID,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    aggregateType: { type: String, required: true, trim: true },
    aggregateId: { type: Schema.Types.ObjectId, required: true },
    eventType: { type: String, required: true, trim: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "PUBLISHED", "FAILED"],
      required: true,
      default: "PENDING",
    },
    attempts: { type: Number, required: true, min: 0, default: 0 },
    availableAt: { type: Date, required: true, default: Date.now },
    publishedAt: { type: Date, default: null },
    lastError: { type: String, default: null },
  },
  { timestamps: true, collection: "outbox_events" },
);

outboxEventSchema.index({ eventId: 1 }, { unique: true });
outboxEventSchema.index({ status: 1, availableAt: 1, createdAt: 1 });
outboxEventSchema.index({
  tenantId: 1,
  aggregateType: 1,
  aggregateId: 1,
  createdAt: 1,
});

export const OutboxEvent = model("OutboxEvent", outboxEventSchema);
