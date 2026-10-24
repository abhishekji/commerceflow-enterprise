import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IconName } from "../../common/enums";
import { MetricCard } from "./MetricCard";

describe("MetricCard", () => {
  it("renders label, value and note", () => {
    render(<MetricCard metric={{ label: "Orders today", value: "5", note: "vs yesterday (3)", icon: IconName.Cart }} />);
    expect(screen.getByText("Orders today")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("vs yesterday (3)")).toBeInTheDocument();
  });
});
