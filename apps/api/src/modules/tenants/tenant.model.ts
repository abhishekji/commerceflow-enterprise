import { Schema, model } from "mongoose";

const tenantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "CLOSED"],
      required: true,
      default: "ACTIVE",
    },
    plan: { type: String, required: true, default: "FREE" },
    defaultCurrency: {
      type: String,
      required: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3,
      default: "USD",
    },
    timeZone: { type: String, required: true, default: "UTC" },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    settings: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true, collection: "tenants" },
);

tenantSchema.index({ slug: 1 }, { unique: true });
tenantSchema.index({ status: 1, createdAt: -1 });

export const Tenant = model("Tenant", tenantSchema);
