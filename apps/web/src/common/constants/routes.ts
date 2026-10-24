export const ROUTES = {
  ROOT: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  SHOP: "/shop",
  ORDERS: "/orders",
  ORDER_PAY: "/orders/:orderId/pay",
  INVENTORY: "/inventory",
  RETURNS: "/returns",
  CLAIMS: "/claims",
  BUNDLES: "/bundles",
  INBOUND_DELIVERIES: "/inbound-deliveries",
  TEAM: "/team",
  ANNOUNCEMENTS: "/announcements",
  COURIERS: "/couriers",
  ACTIVITIES: "/activities",
} as const;

export const orderPayPath = (orderId: string) => `/orders/${orderId}/pay`;
