import type { IconName, OrderStatus } from "../enums";

export interface NavLinkItem {
  label: string;
  icon: IconName;
  path: string;
  badge?: string;
  /** Links without a page yet render the "coming soon" placeholder. */
  comingSoon?: boolean;
}

export interface NavGroup {
  title: string;
  links: NavLinkItem[];
}

export interface MetricCardData {
  label: string;
  value: string;
  note: string;
  icon: IconName;
}

export type ActionTone = "red" | "amber" | "orange" | "blue";

export interface ActionItem {
  label: string;
  count: number | null;
  tone: ActionTone;
  icon: IconName;
}

export interface SelectOption {
  value: string;
  label: string;
}

export type OrderAction = readonly [status: OrderStatus, label: string];
