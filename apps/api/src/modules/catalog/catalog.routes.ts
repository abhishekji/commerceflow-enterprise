import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { authenticate, requireRoles, requireTrustedOrigin } from "../../middleware/auth.js";
import { Tenant } from "../tenants/tenant.model.js";
import { Warehouse } from "../warehouses/warehouse.model.js";
import { Product } from "./product.model.js";
import { Inventory } from "./inventory/inventory.model.js";

export const catalogRouter = Router();

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const managers = requireRoles("TENANT_ADMIN", "FULFILLMENT_MANAGER");

function apiError(statusCode: number, code: string) {
  return Object.assign(new Error(code), { statusCode, code });
}

function isDuplicateKeyError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

type Handler = (request: Request, response: Response) => Promise<void>;
const handle = (handler: Handler) => (request: Request, response: Response, next: NextFunction) => {
  handler(request, response).catch(next);
};

catalogRouter.get("/warehouses", authenticate, handle(async (request, response) => {
  const warehouses = await Warehouse.find({ tenantId: request.auth!.tenantId, active: true })
    .sort({ name: 1 })
    .lean();
  response.json({
    data: warehouses.map((warehouse) => ({
      id: warehouse._id.toString(),
      code: warehouse.code,
      name: warehouse.name,
    })),
  });
}));

const warehouseSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,20}$/),
  name: z.string().trim().min(1).max(120),
  address: z.object({
    line1: z.string().trim().min(1).max(200),
    city: z.string().trim().min(1).max(100),
    postalCode: z.string().trim().min(1).max(20),
    countryCode: z.string().trim().toUpperCase().length(2),
  }),
});

catalogRouter.post("/warehouses", requireTrustedOrigin, authenticate, managers, handle(async (request, response) => {
  const input = warehouseSchema.parse(request.body);
  const { tenantId } = request.auth!;
  const tenant = await Tenant.findById(tenantId).select("timeZone").lean();
  try {
    const warehouse = await Warehouse.create({ ...input, tenantId, timeZone: tenant?.timeZone ?? "UTC" });
    response.status(201).json({
      data: { id: warehouse._id.toString(), code: warehouse.code, name: warehouse.name },
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) throw apiError(409, "WAREHOUSE_CODE_TAKEN");
    throw error;
  }
}));

const listProductsSchema = z.object({
  warehouseId: objectId.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

catalogRouter.get("/products", authenticate, handle(async (request, response) => {
  const query = listProductsSchema.parse(request.query);
  const tenantId = new Types.ObjectId(request.auth!.tenantId);

  const products = await Product.find({ tenantId, active: true })
    .sort({ name: 1 })
    .limit(query.limit)
    .lean();
  const stock = await Inventory.aggregate<{ _id: Types.ObjectId; sellable: number }>([
    {
      $match: {
        tenantId,
        productId: { $in: products.map((product) => product._id) },
        ...(query.warehouseId ? { warehouseId: new Types.ObjectId(query.warehouseId) } : {}),
      },
    },
    { $group: { _id: "$productId", sellable: { $sum: { $subtract: ["$available", "$reserved"] } } } },
  ]);
  const sellableByProduct = new Map(stock.map((row) => [row._id.toString(), row.sellable]));

  response.json({
    data: products.map((product) => ({
      id: product._id.toString(),
      sku: product.sku,
      name: product.name,
      price: product.price,
      priceMinor: Math.round(product.price * 100),
      currency: product.currency,
      sellable: Math.max(0, sellableByProduct.get(product._id.toString()) ?? 0),
    })),
  });
}));

const productSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  price: z.number().min(0).max(10_000_000),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
});

catalogRouter.post("/products", requireTrustedOrigin, authenticate, managers, handle(async (request, response) => {
  const input = productSchema.parse(request.body);
  const { tenantId } = request.auth!;
  const tenant = await Tenant.findById(tenantId).select("defaultCurrency").lean();
  try {
    const product = await Product.create({
      tenantId,
      sku: input.sku,
      name: input.name,
      price: Math.round(input.price * 100) / 100,
      currency: input.currency ?? tenant?.defaultCurrency ?? "USD",
    });
    response.status(201).json({
      data: { id: product._id.toString(), sku: product.sku, name: product.name },
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) throw apiError(409, "SKU_TAKEN");
    throw error;
  }
}));

catalogRouter.get("/inventory", authenticate, managers, handle(async (request, response) => {
  const tenantId = request.auth!.tenantId;
  const [rows, products, warehouses] = await Promise.all([
    Inventory.find({ tenantId }).limit(500).lean(),
    Product.find({ tenantId }).select("sku name").lean(),
    Warehouse.find({ tenantId }).select("code name").lean(),
  ]);
  const productById = new Map(products.map((product) => [product._id.toString(), product]));
  const warehouseById = new Map(warehouses.map((warehouse) => [warehouse._id.toString(), warehouse]));
  response.json({
    data: rows.map((row) => ({
      productId: row.productId.toString(),
      sku: productById.get(row.productId.toString())?.sku ?? "",
      productName: productById.get(row.productId.toString())?.name ?? "",
      warehouseId: row.warehouseId.toString(),
      warehouseName: warehouseById.get(row.warehouseId.toString())?.name ?? "",
      available: row.available,
      reserved: row.reserved,
    })),
  });
}));

const stockSchema = z.object({
  warehouseId: objectId,
  productId: objectId,
  available: z.number().int().min(0).max(10_000_000),
});

catalogRouter.put("/inventory", requireTrustedOrigin, authenticate, managers, handle(async (request, response) => {
  const input = stockSchema.parse(request.body);
  const tenantId = new Types.ObjectId(request.auth!.tenantId);
  const warehouseId = new Types.ObjectId(input.warehouseId);
  const productId = new Types.ObjectId(input.productId);

  const [warehouse, product] = await Promise.all([
    Warehouse.exists({ _id: warehouseId, tenantId }),
    Product.exists({ _id: productId, tenantId }),
  ]);
  if (!warehouse || !product) throw apiError(404, "PRODUCT_OR_WAREHOUSE_NOT_FOUND");

  const key = { tenantId, warehouseId, productId };
  const updated = await Inventory.updateOne(
    { ...key, $expr: { $lte: ["$reserved", input.available] } },
    { $set: { available: input.available } },
  );
  if (updated.matchedCount === 0) {
    if (await Inventory.exists(key)) throw apiError(409, "STOCK_BELOW_RESERVED");
    try {
      await Inventory.create({ ...key, available: input.available, reserved: 0 });
    } catch (error) {
      if (isDuplicateKeyError(error)) throw apiError(409, "STOCK_CHANGED_RETRY");
      throw error;
    }
  }
  response.json({ data: { ...input } });
}));
