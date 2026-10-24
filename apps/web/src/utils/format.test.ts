import { describe, expect, it } from "vitest";
import { formatCount, formatCurrency, formatDate, formatPercent } from "./format";

describe("format utils", () => {
  it("formats minor units as currency", () => {
    expect(formatCurrency(1234, "USD")).toContain("12.34");
  });

  it("flags untracked amounts", () => {
    expect(formatCurrency(null, "USD")).toBe("Not tracked");
    expect(formatCurrency(undefined, "USD")).toBe("Not tracked");
  });

  it("formats counts with locale separators", () => {
    expect(formatCount(1234567)).toBe((1234567).toLocaleString());
  });

  it("formats percentages and missing values", () => {
    expect(formatPercent(42)).toBe("42%");
    expect(formatPercent(null)).toBe("N/A");
  });

  it("formats dates in the local locale", () => {
    const date = new Date("2026-01-02T03:04:05Z");
    expect(formatDate(date.toISOString())).toBe(date.toLocaleString());
  });
});
