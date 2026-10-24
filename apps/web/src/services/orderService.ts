import { API_ENDPOINTS } from "../common/constants";
import type { OrderStatus } from "../common/enums";
import type { CheckoutInput, Order, PaymentPayload, PaymentResult } from "../common/types";
import { apiRequest, jsonBody } from "../utils/apiClient";

export const orderService = {
  list: (status?: OrderStatus | "") =>
    apiRequest<Order[]>(`${API_ENDPOINTS.ORDERS}${status ? `?status=${status}` : ""}`),
  get: (orderId: string) => apiRequest<Order>(API_ENDPOINTS.order(orderId)),
  place: (input: CheckoutInput) =>
    apiRequest<Order>(API_ENDPOINTS.ORDERS, { method: "POST", ...jsonBody(input) }),
  transition: (orderId: string, status: OrderStatus) =>
    apiRequest<Order>(API_ENDPOINTS.orderTransition(orderId), { method: "POST", ...jsonBody({ status }) }),
};

export const paymentService = {
  pay: (orderId: string, payload: PaymentPayload) =>
    apiRequest<PaymentResult>(API_ENDPOINTS.orderPayment(orderId), { method: "POST", ...jsonBody(payload) }),
};
