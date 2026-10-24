import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeading } from "./PageHeading";

describe("PageHeading", () => {
  it("renders title, subtitle and optional filters", () => {
    render(<PageHeading title="Orders" subtitle="Orders overview"><span>filter</span></PageHeading>);
    expect(screen.getByRole("heading", { name: "Orders" })).toBeInTheDocument();
    expect(screen.getByText("Orders overview")).toBeInTheDocument();
    expect(screen.getByText("filter")).toBeInTheDocument();
  });

  it("omits the filters wrapper without children", () => {
    const { container } = render(<PageHeading title="A" subtitle="B" />);
    expect(container.querySelector(".filters")).toBeNull();
  });
});
