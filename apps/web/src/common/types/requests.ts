import type { PaymentMethod } from "../enums";
import type { CurrencyCode, EntityId, Order } from "./models";

export interface LoginCredentials {
  tenantSlug: string;
  email: string;
  password: string;
}

export interface RegisterPayload {
  tenantName: string;
  tenantSlug: string;
  defaultCurrency: CurrencyCode;
  timeZone: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface CheckoutItemInput {
  productId: EntityId;
  quantity: number;
}

export interface CheckoutInput {
  warehouseId: EntityId;
  items: CheckoutItemInput[];
}

export interface WarehouseInput {
  code: string;
  name: string;
  address: { line1: string; city: string; postalCode: string; countryCode: string };
}

export interface ProductInput {
  sku: string;
  name: string;
  price: number;
}

export interface StockInput {
  warehouseId: EntityId;
  productId: EntityId;
  available: number;
}

export interface CardPayment {
  method: PaymentMethod.Card;
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

export interface UpiPayment {
  method: PaymentMethod.Upi;
  upiId: string;
}

export interface NetBankingPayment {
  method: PaymentMethod.NetBanking;
  bank: string;
}

export interface WalletPayment {
  method: PaymentMethod.Wallet;
  wallet: string;
}

export interface CashOnDeliveryPayment {
  method: PaymentMethod.CashOnDelivery;
}

export type PaymentPayload =
  | CardPayment
  | UpiPayment
  | NetBankingPayment
  | WalletPayment
  | CashOnDeliveryPayment;

export interface PaymentResult {
  order: Order;
  reference: string;
}
