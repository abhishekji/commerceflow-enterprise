import { Schema, model } from "mongoose";

const auditLogSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    actorType: {
      type: String,
      enum: ["USER", "SYSTEM", "API_CLIENT"],
      required: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    action: { type: String, required: true, trim: true },
    resourceType: { type: String, required: true, trim: true },
    resourceId: { type: Schema.Types.ObjectId, default: null },
    requestId: { type: String, trim: true, default: null },
    ipAddress: { type: String, trim: true, default: null },
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "audit_logs",
  },
);

auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({
  tenantId: 1,
  resourceType: 1,
  resourceId: 1,
  createdAt: -1,
});
auditLogSchema.index({ tenantId: 1, actorId: 1, createdAt: -1 });

export const AuditLog = model("AuditLog", auditLogSchema);
