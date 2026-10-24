import { IconName } from "../common/enums";
import type { ActionItem, DashboardSummary, MetricCardData, TimeseriesMonth } from "../common/types";
import { formatCount, formatCurrency, formatPercent } from "./format";

export function buildMetrics(summary: DashboardSummary): MetricCardData[] {
  const { metrics: values, currency } = summary;
  return [
    { label: "Orders today", value: formatCount(values.ordersToday), note: `vs yesterday (${formatCount(values.ordersYesterday)})`, icon: IconName.Cart },
    { label: "Orders this month", value: formatCount(values.ordersThisMonth), note: `vs last month (${formatCount(values.ordersPreviousMonth)})`, icon: IconName.Trend },
    { label: "Orders this year", value: formatCount(values.ordersThisYear), note: `vs last year (${formatCount(values.ordersPreviousYear)})`, icon: IconName.Bars },
    { label: "COD today", value: formatCurrency(values.codMinor, currency), note: "Payment method isn't stored", icon: IconName.Truck },
    { label: "COD this month", value: formatCurrency(values.codMinor, currency), note: "Payment method isn't stored", icon: IconName.Truck },
    { label: "Lost COD this month", value: formatCurrency(values.lostCodMinor, currency), note: "Shipment loss isn't stored", icon: IconName.Money },
    {
      label: `Avg order value (${currency})`,
      value: formatCurrency(values.averageOrderValueMinor, currency),
      note: values.averageOrderValueMinor == null ? "No orders in this currency" : "This month; excludes cancelled",
      icon: IconName.Money,
    },
    { label: "Returning customers this month", value: formatPercent(values.returningCustomerRateMonth), note: "2+ non-cancelled orders this month", icon: IconName.Warning },
    { label: "Returning customers all time", value: formatPercent(values.returningCustomerRateAllTime), note: "2+ non-cancelled orders", icon: IconName.Money },
  ];
}

export function buildActionItems(actions: DashboardSummary["actions"]): ActionItem[] {
  return [
    { label: "Requires Merchant Correction", count: actions.merchantCorrection, tone: "red", icon: IconName.Square },
    { label: "Awaiting Vendor Validation", count: actions.vendorValidation, tone: "amber", icon: IconName.Clock },
    { label: "Orders Without AWB", count: actions.ordersWithoutAwb, tone: "orange", icon: IconName.Box },
    { label: "Out of Stock Orders", count: actions.outOfStockOrders, tone: "blue", icon: IconName.Trend },
  ];
}

const CHART_WIDTH = 638;
const CHART_BASELINE = 108;
const CHART_HEIGHT = 88;

export function chartPoints(values: number[], max: number = Math.max(1, ...values)): string {
  return values
    .map((value, index) => {
      const x = values.length < 2 ? 0 : (index / (values.length - 1)) * CHART_WIDTH;
      const y = CHART_BASELINE - (value / max) * CHART_HEIGHT;
      return `${x},${y}`;
    })
    .join(" ");
}

export function seriesMax(months: TimeseriesMonth[], includePreviousYear: boolean): number {
  return Math.max(
    1,
    ...months.map((month) => month.orders),
    ...(includePreviousYear ? months.map((month) => month.previousYearOrders) : []),
  );
}
