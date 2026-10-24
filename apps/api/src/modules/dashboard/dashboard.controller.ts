import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import {
  getDashboardFilters as loadDashboardFilters,
  getDashboardSummary as loadDashboardSummary,
  getDashboardTimeseries as loadDashboardTimeseries,
} from "./dashboard.service.js";

const filterSchema = z.object({
  warehouseId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
});

export async function getDashboardFilters(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    response.json({ data: await loadDashboardFilters(request.auth!.tenantId) });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardSummary(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const filters = filterSchema.parse(request.query);
    if (filters.warehouseId && !mongoose.isValidObjectId(filters.warehouseId)) {
      response.status(400).json({ error: { code: "INVALID_WAREHOUSE_ID" } });
      return;
    }
    response.json({
      data: await loadDashboardSummary(request.auth!.tenantId, filters.warehouseId),
    });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardTimeseries(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const filters = filterSchema.parse(request.query);
    response.json({
      data: await loadDashboardTimeseries(request.auth!.tenantId, filters.warehouseId),
    });
  } catch (error) {
    next(error);
  }
}
