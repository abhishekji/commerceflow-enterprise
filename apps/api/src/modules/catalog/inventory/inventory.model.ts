import { Schema, model } from "mongoose";

const inventorySchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    available: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    reserved: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
  },
  { timestamps: true, collection: "inventory" },
);

inventorySchema.index(
  { tenantId: 1, warehouseId: 1, productId: 1 },
  { unique: true },
);

export const Inventory = model("Inventory", inventorySchema);
