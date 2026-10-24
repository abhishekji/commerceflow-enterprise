import { Schema, model } from "mongoose";

const productSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    sku: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{3}$/,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.index({ tenantId: 1, sku: 1 }, { unique: true });

productSchema.index({ tenantId: 1, active: 1, name: 1 });

export const Product = model("Product", productSchema);
