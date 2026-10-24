import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as AuthContext from "../../context/AuthContext";
import { dashboardService } from "../../services";
import { DashboardPage } from "./DashboardPage";

vi.mock("../../services", () => ({
  dashboardService: { filters: vi.fn(), summary: vi.fn(), timeseries: vi.fn() },
}));

describe("DashboardPage", () => {
  it("loads and renders metrics for the dashboard", async () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({ expireSession: vi.fn() } as never);
    vi.mocked(dashboardService.filters).mockResolvedValue({ warehouses: [{ id: "w1", name: "Main" }] });
    vi.mocked(dashboardService.summary).mockResolvedValue({
      currency: "USD",
      metrics: {
        ordersToday: 5, ordersYesterday: 3, ordersThisMonth: 40, ordersPreviousMonth: 30,
        ordersThisYear: 400, ordersPreviousYear: 350, codMinor: null, lostCodMinor: null,
        averageOrderValueMinor: null, returningCustomerRateMonth: null, returningCustomerRateAllTime: null,
      },
      delivery: { deliveryRate: null, trackingConfigured: false, delivered: 0, inTransit: 0, returns: null, trackedTotal: 0 },
      actions: { merchantCorrection: null, vendorValidation: null, ordersWithoutAwb: null, outOfStockOrders: null, outOfStockInventoryPositions: 0 },
    });
    vi.mocked(dashboardService.timeseries).mockResolvedValue({ months: [] });

    render(<DashboardPage />);
    expect(await screen.findByText("Orders today")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Main" })).toBeInTheDocument();
  });

  it("shows an error when data fails to load", async () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({ expireSession: vi.fn() } as never);
    vi.mocked(dashboardService.filters).mockResolvedValue({ warehouses: [] });
    vi.mocked(dashboardService.summary).mockRejectedValue(new Error("boom"));
    vi.mocked(dashboardService.timeseries).mockRejectedValue(new Error("boom"));
    render(<DashboardPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load dashboard data");
  });
});
