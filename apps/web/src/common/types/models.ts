import type { OrderStatus, PaymentMethod, PaymentStatus, ShipmentStatus, UserRole } from "../enums";

export type EntityId = string;
export type Nullable<T> = T | null;
/** Monetary amount in the currency's minor unit (e.g. cents). */
export type MinorUnits = number;
export type IsoDateString = string;
export type CurrencyCode = string;

export interface SessionUser {
  id: EntityId;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface SessionTenant {
  id: EntityId;
  name: string;
  defaultCurrency: CurrencyCode;
  timeZone: string;
}

export interface Session {
  user: SessionUser;
  tenant: SessionTenant;
}

export interface Warehouse {
  id: EntityId;
  name: string;
  code: string;
}

export interface Product {
  id: EntityId;
  sku: string;
  name: string;
  priceMinor: MinorUnits;
  currency: CurrencyCode;
  /** Units that can still be ordered (available - reserved). */
  sellable: number;
}

export interface InventoryRow {
  warehouseId: EntityId;
  productId: EntityId;
  productName: string;
  sku: string;
  warehouseName: string;
  available: number;
  reserved: number;
}

export interface OrderItem {
  productId: EntityId;
  sku: string;
  name: string;
  quantity: number;
  unitPriceMinor: MinorUnits;
}

export interface ShipmentEvent {
  status: ShipmentStatus;
  note: string;
  at: IsoDateString;
}

export interface Shipment {
  carrier: string;
  trackingNumber: string;
  status: ShipmentStatus;
  events: ShipmentEvent[];
}

export interface Order {
  id: EntityId;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: Nullable<PaymentMethod>;
  paymentReference: Nullable<string>;
  paymentSummary: Nullable<string>;
  paidAt: Nullable<IsoDateString>;
  totalMinor: MinorUnits;
  currency: CurrencyCode;
  warehouseId: EntityId;
  customerId: EntityId;
  customerName: string;
  createdAt: IsoDateString;
  items: OrderItem[];
  shipment: Nullable<Shipment>;
}

export interface NotificationItem {
  id: EntityId;
  type: string;
  message: string;
  createdAt: IsoDateString;
}

export interface DashboardMetrics {
  ordersToday: number;
  ordersYesterday: number;
  ordersThisMonth: number;
  ordersPreviousMonth: number;
  ordersThisYear: number;
  ordersPreviousYear: number;
  codMinor: Nullable<MinorUnits>;
  lostCodMinor: Nullable<MinorUnits>;
  averageOrderValueMinor: Nullable<MinorUnits>;
  returningCustomerRateMonth: Nullable<number>;
  returningCustomerRateAllTime: Nullable<number>;
}

export interface DeliverySummary {
  deliveryRate: Nullable<number>;
  trackingConfigured: boolean;
  delivered: number;
  inTransit: number;
  returns: Nullable<number>;
  trackedTotal: number;
}

export interface ActionSummary {
  merchantCorrection: Nullable<number>;
  vendorValidation: Nullable<number>;
  ordersWithoutAwb: Nullable<number>;
  outOfStockOrders: Nullable<number>;
  outOfStockInventoryPositions: number;
}

export interface DashboardSummary {
  currency: CurrencyCode;
  metrics: DashboardMetrics;
  delivery: DeliverySummary;
  actions: ActionSummary;
}

export interface TimeseriesMonth {
  month: string;
  label: string;
  orders: number;
  previousYearOrders: number;
}

export interface DashboardTimeseries {
  months: TimeseriesMonth[];
}

export interface DashboardFilters {
  warehouses: Pick<Warehouse, "id" | "name">[];
}
