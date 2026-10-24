import { PaymentMethod } from "../enums";
import type { SelectOption } from "../types";

export const PAYMENT_METHOD_OPTIONS: { id: PaymentMethod; label: string }[] = [
  { id: PaymentMethod.Card, label: "Credit / debit card" },
  { id: PaymentMethod.Upi, label: "UPI" },
  { id: PaymentMethod.NetBanking, label: "Net banking" },
  { id: PaymentMethod.Wallet, label: "Wallet" },
  { id: PaymentMethod.CashOnDelivery, label: "Pay on delivery" },
];

export const BANK_OPTIONS: SelectOption[] = [
  { value: "DEMO_BANK_A", label: "Demo Bank A" },
  { value: "DEMO_BANK_B", label: "Demo Bank B" },
  { value: "DEMO_BANK_C", label: "Demo Bank C" },
];

export const WALLET_OPTIONS: SelectOption[] = [
  { value: "DEMO_WALLET", label: "Demo Wallet" },
  { value: "DEMO_PAY", label: "Demo Pay" },
];

export const SANDBOX_HINT =
  "Demo mode — no real payment is taken. Use card 4242 4242 4242 4242 (any future expiry, any CVV) to succeed, " +
  "4000 0000 0000 0002 to see a decline, or a UPI ID starting with “fail”.";
