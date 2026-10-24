import type { MinorUnits, Nullable } from "../common/types";

export function formatCurrency(minor: Nullable<MinorUnits> | undefined, currency: string): string {
  if (minor == null) return "Not tracked";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

export function formatCount(value: number): string {
  return value.toLocaleString();
}

export function formatPercent(value: Nullable<number>): string {
  return value == null ? "N/A" : `${value}%`;
}

export function formatDate(value: string | number | Date): string {
  return new Date(value).toLocaleString();
}
