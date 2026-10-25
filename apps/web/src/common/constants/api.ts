export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1"
).replace(/\/$/, "");

export const ORDERS_POLL_INTERVAL_MS = 4000;
export const NOTIFICATIONS_POLL_INTERVAL_MS = 8000;

export const API_ENDPOINTS = {
  AUTH_ME: "/auth/me",
  AUTH_LOGIN: "/auth/login",
  AUTH_REGISTER: "/auth/register",
  AUTH_LOGOUT: "/auth/logout",
  DASHBOARD_FILTERS: "/dashboard/filters",
  DASHBOARD_SUMMARY: "/dashboard/summary",
  DASHBOARD_TIMESERIES: "/dashboard/timeseries",
  CATALOG_WAREHOUSES: "/catalog/warehouses",
  CATALOG_PRODUCTS: "/catalog/products",
  CATALOG_INVENTORY: "/catalog/inventory",
  ORDERS: "/orders",
  NOTIFICATIONS: "/notifications",
  AI_CHAT: "/ai/chat",
  AI_INSIGHTS: "/ai/insights",
  order: (orderId: string) => `/orders/${orderId}`,
  orderTransition: (orderId: string) => `/orders/${orderId}/transition`,
  orderPayment: (orderId: string) => `/payments/orders/${orderId}/pay`,
} as const;
