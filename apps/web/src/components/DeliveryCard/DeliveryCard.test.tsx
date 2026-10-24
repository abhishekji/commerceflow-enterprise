import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeliveryCard } from "./DeliveryCard";

const base = { deliveryRate: 90, trackingConfigured: true, delivered: 9, inTransit: 1, returns: null, trackedTotal: 10 };

describe("DeliveryCard", () => {
  it("shows the delivery rate and counts", () => {
    render(<DeliveryCard delivery={base} />);
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("(tracked shipments)")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("explains when tracking is not configured", () => {
    render(<DeliveryCard delivery={{ ...base, deliveryRate: null, trackingConfigured: false }} />);
    expect(screen.getByText("(tracking not configured)")).toBeInTheDocument();
    expect(screen.getByText("(Order status only)")).toBeInTheDocument();
  });
});
