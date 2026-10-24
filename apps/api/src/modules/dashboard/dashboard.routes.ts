import { Router } from "express";
import { authenticate, requireDashboardRole } from "../../middleware/auth.js";
import {
  getDashboardFilters,
  getDashboardSummary,
  getDashboardTimeseries,
} from "./dashboard.controller.js";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, requireDashboardRole);
dashboardRouter.get("/filters", getDashboardFilters);
dashboardRouter.get("/summary", getDashboardSummary);
dashboardRouter.get("/timeseries", getDashboardTimeseries);
