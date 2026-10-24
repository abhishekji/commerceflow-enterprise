import { ApiErrorCode } from "../enums";

export const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

export const ERROR_MESSAGES: Partial<Record<string, string>> = {
  [ApiErrorCode.InsufficientInventory]: "Not enough stock for one or more items. Reduce the quantity and try again.",
  [ApiErrorCode.WarehouseNotFound]: "That warehouse is no longer available.",
  [ApiErrorCode.ProductNotFoundOrInactive]: "One or more products are no longer available.",
  [ApiErrorCode.MixedCurrencies]: "All items in one order must use the same currency.",
  [ApiErrorCode.SkuTaken]: "A product with that SKU already exists.",
  [ApiErrorCode.WarehouseCodeTaken]: "A warehouse with that code already exists.",
  [ApiErrorCode.StockBelowReserved]: "Stock can't be set below the quantity already reserved by open orders.",
  [ApiErrorCode.InvalidOrderTransition]: "That status change isn't allowed from the order's current status.",
  [ApiErrorCode.OrderChanged]: "The order changed while you were working. Refresh and try again.",
  [ApiErrorCode.PaymentDeclined]: "The payment was declined. Try a different method or card.",
  [ApiErrorCode.InvalidCardNumber]: "That card number isn't valid.",
  [ApiErrorCode.CardExpired]: "That card has expired.",
  [ApiErrorCode.AlreadyPaid]: "This order has already been paid.",
  [ApiErrorCode.OrderNotPayable]: "This order can no longer be paid.",
  [ApiErrorCode.PaymentRequired]: "The order must be paid before it can be confirmed.",
  [ApiErrorCode.OrderNotFound]: "Order not found.",
  [ApiErrorCode.Forbidden]: "You don't have permission to do that.",
  [ApiErrorCode.ValidationError]: "Check the details you entered and try again.",
  [ApiErrorCode.Unauthenticated]: "Your session expired. Sign in again.",
};

export const AUTH_MESSAGES = {
  CONNECTION: "Unable to connect to the API. Check that the service is running.",
  LOGIN_INVALID: "The organization, email, or password is incorrect.",
  LOGIN_FAILED: "Unable to sign in. Check the API connection and try again.",
  REGISTER_SLUG_TAKEN: "That organization slug is already taken. Choose another.",
  REGISTER_INVALID: "Check the details you entered and try again.",
  REGISTER_FAILED: "Unable to create the account. Check the API connection and try again.",
  PASSWORD_MISMATCH: "Passwords do not match.",
  LOGOUT_FAILED: "Could not sign out. Please try again.",
} as const;

export const DASHBOARD_MESSAGES = {
  FILTERS_FAILED: "Unable to load dashboard filters.",
  DATA_FAILED: "Unable to load dashboard data. Please try again.",
  SESSION_EXPIRED: "Your session expired. Sign in again.",
} as const;
