import { describe, expect, it } from "vitest";
import type { DashboardSummary } from "../common/types";
import { buildActionItems, buildMetrics, chartPoints, seriesMax } from "./dashboard";

const summary: DashboardSummary = {
  currency: "USD",
  metrics: {
    ordersToday: 5, ordersYesterday: 3, ordersThisMonth: 40, ordersPreviousMonth: 30,
    ordersThisYear: 400, ordersPreviousYear: 350, codMinor: 10000, lostCodMinor: 0,
    averageOrderValueMinor: null, returningCustomerRateMonth: null, returningCustomerRateAllTime: 12,
  },
  delivery: { deliveryRate: 90, trackingConfigured: true, delivered: 9, inTransit: 1, returns: null, trackedTotal: 10 },
  actions: { merchantCorrection: 1, vendorValidation: null, ordersWithoutAwb: 2, outOfStockOrders: 0, outOfStockInventoryPositions: 4 },
};

describe("dashboard utils", () => {
  it("builds the nine metric cards", () => {
    const metrics = buildMetrics(summary);
    expect(metrics).toHaveLength(9);
    expect(metrics[0]).toMatchObject({ label: "Orders today", value: "5" });
  });

  it("explains missing average order value and rates", () => {
    const metrics = buildMetrics(summary);
    const average = metrics.find((metric) => metric.label.startsWith("Avg order value"))!;
    expect(average.value).toBe("Not tracked");
    expect(average.note).toBe("No orders in this currency");
    expect(metrics.find((metric) => metric.label === "Returning customers this month")!.value).toBe("N/A");
    expect(metrics.find((metric) => metric.label === "Returning customers all time")!.value).toBe("12%");
  });

  it("keeps null action counts so the UI can show N/A", () => {
    const items = buildActionItems(summary.actions);
    expect(items.map((item) => item.count)).toEqual([1, null, 2, 0]);
  });

  it("scales chart points to the plot area", () => {
    expect(chartPoints([0, 10], 10)).toBe("0,108 638,20");
    expect(chartPoints([5], 10)).toBe("0,64");
  });

  it("includes previous-year values in the scale only when comparing", () => {
    const months = [{ month: "2026-01", label: "Jan", orders: 2, previousYearOrders: 9 }];
    expect(seriesMax(months, false)).toBe(2);
    expect(seriesMax(months, true)).toBe(9);
  });
});
