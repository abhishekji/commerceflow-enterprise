import { describe, expect, it } from "vitest";
import { formatCardNumber, formatExpiry, orderLabel, slugify } from "./text";

describe("text utils", () => {
  it("labels orders by the last six id characters", () => {
    expect(orderLabel("65a1b2c3d4e5f60718293a4b")).toBe("#293A4B");
  });

  it("slugifies organization names", () => {
    expect(slugify("  Acme & Sons, Inc.  ")).toBe("acme-sons-inc");
    expect(slugify("a".repeat(120))).toHaveLength(80);
  });

  it("groups card numbers in blocks of four and strips non-digits", () => {
    expect(formatCardNumber("4242424242424242")).toBe("4242 4242 4242 4242");
    expect(formatCardNumber("4242-abcd-4242")).toBe("4242 4242");
  });

  it("formats expiry as MM/YY", () => {
    expect(formatExpiry("1230")).toBe("12/30");
    expect(formatExpiry("12")).toBe("12");
    expect(formatExpiry("12/3/0x99")).toBe("12/30");
  });
});
