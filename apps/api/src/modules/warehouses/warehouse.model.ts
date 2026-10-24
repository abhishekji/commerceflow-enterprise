import { Schema, model } from "mongoose";

const addressSchema = new Schema(
  {
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true, default: "" },
    city: { type: String, required: true, trim: true },
    region: { type: String, trim: true, default: "" },
    postalCode: { type: String, required: true, trim: true },
    countryCode: {
      type: String,
      required: true,
      uppercase: true,
      minlength: 2,
      maxlength: 2,
    },
  },
  { _id: false },
);

const warehouseSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    address: { type: addressSchema, required: true },
    timeZone: { type: String, required: true, default: "UTC" },
    active: { type: Boolean, required: true, default: true },
  },
  { timestamps: true, collection: "warehouses" },
);

warehouseSchema.index({ tenantId: 1, code: 1 }, { unique: true });
warehouseSchema.index({ tenantId: 1, active: 1, name: 1 });

export const Warehouse = model("Warehouse", warehouseSchema);
