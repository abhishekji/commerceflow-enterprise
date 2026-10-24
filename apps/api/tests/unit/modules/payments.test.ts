import { describe, expect, it, vi } from "vitest";
import { getPaymentMethods } from "../../../src/modules/payments/payment.controller.js";
import { netBankingBanks, payOrderSchema, wallets } from "../../../src/modules/payments/payment.service.js";

const card = { method: "CARD", cardholderName: "Ada Lovelace", cardNumber: "4242-4242 4242 4242", expiry: "12/30", cvv: "123" };

describe("payOrderSchema", () => {
  it("normalises card numbers by stripping spaces and dashes", () => {
    const parsed = payOrderSchema.parse(card);
    expect(parsed).toMatchObject({ method: "CARD", cardNumber: "4242424242424242" });
  });

  it.each([
    ["card number too short", { ...card, cardNumber: "1234" }],
    ["card number with letters", { ...card, cardNumber: "4242abcd42424242" }],
    ["bad expiry month", { ...card, expiry: "13/30" }],
    ["bad expiry format", { ...card, expiry: "2030-12" }],
    ["short cvv", { ...card, cvv: "12" }],
    ["short name", { ...card, cardholderName: "A" }],
    ["unknown method", { method: "CHEQUE" }],
    ["unknown bank", { method: "NET_BANKING", bank: "REAL_BANK" }],
    ["unknown wallet", { method: "WALLET", wallet: "REAL_WALLET" }],
    ["upi without handle", { method: "UPI", upiId: "ada" }],
  ])("rejects %s", (_name, body) => {
    expect(payOrderSchema.safeParse(body).success).toBe(false);
  });

  it("accepts every non-card method", () => {
    expect(payOrderSchema.safeParse({ method: "UPI", upiId: "ada@demo" }).success).toBe(true);
    expect(payOrderSchema.safeParse({ method: "NET_BANKING", bank: netBankingBanks[0] }).success).toBe(true);
    expect(payOrderSchema.safeParse({ method: "WALLET", wallet: wallets[0] }).success).toBe(true);
    expect(payOrderSchema.safeParse({ method: "COD" }).success).toBe(true);
  });
});

describe("getPaymentMethods", () => {
  it("returns the sandbox method catalogue", () => {
    const json = vi.fn();
    getPaymentMethods({} as never, { json } as never);
    const { data } = json.mock.calls[0]![0];
    expect(data.methods).toEqual(["CARD", "UPI", "NET_BANKING", "WALLET", "COD"]);
    expect(data.banks).toEqual([...netBankingBanks]);
    expect(data.sandbox).toBe(true);
    expect(data.testHints.cardDeclined).toBe("4000 0000 0000 0002");
  });
});
