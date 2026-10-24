import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VolumeChart } from "./VolumeChart";

const series = [
  { month: "2026-01", label: "Jan", orders: 2, previousYearOrders: 4 },
  { month: "2026-02", label: "Feb", orders: 6, previousYearOrders: 1 },
];

describe("VolumeChart", () => {
  it("draws both lines when trend and compare are on", () => {
    const { container } = render(<VolumeChart compare trend series={series} />);
    expect(container.querySelectorAll("polyline")).toHaveLength(2);
    expect(screen.getByText("Jan")).toBeInTheDocument();
  });

  it("hides lines when toggled off", () => {
    const { container } = render(<VolumeChart compare={false} trend={false} series={series} />);
    expect(container.querySelectorAll("polyline")).toHaveLength(0);
  });
});
