import { UserRole } from "../enums";

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "INR", "AED", "AUD", "CAD", "SGD"] as const;

export const MANAGER_ROLES: readonly UserRole[] = [UserRole.TenantAdmin, UserRole.FulfillmentManager];
