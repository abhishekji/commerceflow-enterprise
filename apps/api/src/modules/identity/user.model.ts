import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["TENANT_ADMIN", "FULFILLMENT_MANAGER", "STAFF", "CUSTOMER"],
      required: true,
      default: "CUSTOMER",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INVITED", "SUSPENDED"],
      required: true,
      default: "ACTIVE",
    },
    lastLoginAt: { type: Date, default: null },
    tokenVersion: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, collection: "users" },
);

userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
userSchema.index({ tenantId: 1, status: 1, role: 1 });

export const User = model("User", userSchema);
