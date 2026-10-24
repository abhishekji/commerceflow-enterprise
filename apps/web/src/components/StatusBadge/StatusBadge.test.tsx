import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderStatus, PaymentStatus } from "../../common/enums";
import { OrderStatusBadge, PaymentStatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("shows the friendly order status label and class", () => {
    render(<OrderStatusBadge status={OrderStatus.Fulfilling} />);
    expect(screen.getByText("Packing")).toHaveClass("badge-fulfilling");
  });

  it("shows the friendly payment label and class", () => {
    render(<PaymentStatusBadge status={PaymentStatus.Unpaid} />);
    expect(screen.getByText("Awaiting payment")).toHaveClass("badge-pay-unpaid");
  });
});
