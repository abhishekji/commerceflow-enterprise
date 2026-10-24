import { API_ENDPOINTS } from "../common/constants";
import type { DashboardFilters, DashboardSummary, DashboardTimeseries, NotificationItem } from "../common/types";
import { apiRequest } from "../utils/apiClient";

const withWarehouse = (warehouseId: string) =>
  warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : "";

export const dashboardService = {
  filters: () => apiRequest<DashboardFilters>(API_ENDPOINTS.DASHBOARD_FILTERS),
  summary: (warehouseId: string) =>
    apiRequest<DashboardSummary>(`${API_ENDPOINTS.DASHBOARD_SUMMARY}${withWarehouse(warehouseId)}`),
  timeseries: (warehouseId: string) =>
    apiRequest<DashboardTimeseries>(`${API_ENDPOINTS.DASHBOARD_TIMESERIES}${withWarehouse(warehouseId)}`),
};

export const notificationService = {
  list: () => apiRequest<NotificationItem[]>(API_ENDPOINTS.NOTIFICATIONS),
};
