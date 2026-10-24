export enum UserRole {
  TenantAdmin = "TENANT_ADMIN",
  FulfillmentManager = "FULFILLMENT_MANAGER",
  Staff = "STAFF",
  Customer = "CUSTOMER",
}

export enum OrderStatus {
  Pending = "PENDING",
  Confirmed = "CONFIRMED",
  Fulfilling = "FULFILLING",
  Shipped = "SHIPPED",
  Delivered = "DELIVERED",
  Cancelled = "CANCELLED",
}

export enum PaymentStatus {
  Unpaid = "UNPAID",
  Paid = "PAID",
  CashOnDelivery = "COD",
  Refunded = "REFUNDED",
}

export enum PaymentMethod {
  Card = "CARD",
  Upi = "UPI",
  NetBanking = "NET_BANKING",
  Wallet = "WALLET",
  CashOnDelivery = "COD",
}

export enum ShipmentStatus {
  Requested = "REQUESTED",
  Packing = "PACKING",
  InTransit = "IN_TRANSIT",
  Delivered = "DELIVERED",
  Cancelled = "CANCELLED",
}

export enum HttpStatus {
  NoContent = 204,
  BadRequest = 400,
  Unauthorized = 401,
  Conflict = 409,
}

export enum ApiErrorCode {
  InsufficientInventory = "INSUFFICIENT_INVENTORY",
  WarehouseNotFound = "WAREHOUSE_NOT_FOUND",
  ProductNotFoundOrInactive = "PRODUCT_NOT_FOUND_OR_INACTIVE",
  MixedCurrencies = "MIXED_CURRENCIES",
  SkuTaken = "SKU_TAKEN",
  WarehouseCodeTaken = "WAREHOUSE_CODE_TAKEN",
  StockBelowReserved = "STOCK_BELOW_RESERVED",
  InvalidOrderTransition = "INVALID_ORDER_TRANSITION",
  OrderChanged = "ORDER_CHANGED",
  OrderNotFound = "ORDER_NOT_FOUND",
  Forbidden = "FORBIDDEN",
  ValidationError = "VALIDATION_ERROR",
  Unauthenticated = "UNAUTHENTICATED",
  PaymentDeclined = "PAYMENT_DECLINED",
  InvalidCardNumber = "INVALID_CARD_NUMBER",
  CardExpired = "CARD_EXPIRED",
  AlreadyPaid = "ALREADY_PAID",
  OrderNotPayable = "ORDER_NOT_PAYABLE",
  PaymentRequired = "PAYMENT_REQUIRED",
}

export enum IconName {
  Grid = "grid",
  Cart = "cart",
  Return = "return",
  Clipboard = "clipboard",
  Box = "box",
  Truck = "truck",
  Users = "users",
  Megaphone = "megaphone",
  Pin = "pin",
  Trend = "trend",
  Bars = "bars",
  Money = "money",
  Warning = "warning",
  Square = "square",
  Clock = "clock",
  Bell = "bell",
  Sun = "sun",
  Warehouse = "warehouse",
  Store = "store",
  Chart = "chart",
  Calendar = "calendar",
  Menu = "menu",
  Chevron = "chevron",
  Down = "down",
  Feedback = "feedback",
}

export enum AuthMode {
  Login = "login",
  Register = "register",
}

export enum PaymentFlowStep {
  Form = "form",
  Receipt = "receipt",
}
