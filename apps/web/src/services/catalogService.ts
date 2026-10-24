import { API_ENDPOINTS } from "../common/constants";
import type {
  CheckoutInput, InventoryRow, Product, ProductInput, StockInput, Warehouse, WarehouseInput,
} from "../common/types";
import { apiRequest, jsonBody } from "../utils/apiClient";

const withWarehouse = (warehouseId?: string) =>
  warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : "";

export const catalogService = {
  warehouses: () => apiRequest<Warehouse[]>(API_ENDPOINTS.CATALOG_WAREHOUSES),
  products: (warehouseId?: string) =>
    apiRequest<Product[]>(`${API_ENDPOINTS.CATALOG_PRODUCTS}${withWarehouse(warehouseId)}`),
  inventory: () => apiRequest<InventoryRow[]>(API_ENDPOINTS.CATALOG_INVENTORY),
  addWarehouse: (input: WarehouseInput) =>
    apiRequest(API_ENDPOINTS.CATALOG_WAREHOUSES, { method: "POST", ...jsonBody(input) }),
  addProduct: (input: ProductInput) =>
    apiRequest(API_ENDPOINTS.CATALOG_PRODUCTS, { method: "POST", ...jsonBody(input) }),
  setStock: (input: StockInput) =>
    apiRequest(API_ENDPOINTS.CATALOG_INVENTORY, { method: "PUT", ...jsonBody(input) }),
};

export type { CheckoutInput };
