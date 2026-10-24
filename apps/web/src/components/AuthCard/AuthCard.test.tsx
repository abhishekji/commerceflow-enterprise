import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthCard } from "./AuthCard";

describe("AuthCard", () => {
  it("shows heading, error alert and children", () => {
    render(<AuthCard title="SIGN IN" subtitle="Welcome" error="Bad creds" onSubmit={() => {}}><button>go</button></AuthCard>);
    expect(screen.getByRole("heading", { name: "SIGN IN" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Bad creds");
    expect(screen.getByText("go")).toBeInTheDocument();
  });

  it("applies the wide variant", () => {
    const { container } = render(<AuthCard title="t" subtitle="s" wide onSubmit={() => {}}><span /></AuthCard>);
    expect(container.querySelector("form")).toHaveClass("register-card");
  });
});
