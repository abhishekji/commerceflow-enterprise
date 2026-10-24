import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActionPanel } from "./ActionPanel";

describe("ActionPanel", () => {
  it("shows counts, N/A for unavailable ones, and out-of-stock positions", () => {
    render(<ActionPanel actions={{ merchantCorrection: 3, vendorValidation: null, ordersWithoutAwb: 0, outOfStockOrders: 1, outOfStockInventoryPositions: 7 }} />);
    expect(screen.getByText("Requires Merchant Correction")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();
    expect(screen.getByText("7 inventory positions")).toBeInTheDocument();
  });
});
