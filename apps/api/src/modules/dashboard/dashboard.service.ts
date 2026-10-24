import { Types } from "mongoose";
import { Inventory } from "../catalog/inventory/inventory.model.js";
import { Order } from "../orders/order.model.js";
import { Tenant } from "../tenants/tenant.model.js";
import { Warehouse } from "../warehouses/warehouse.model.js";

interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function zonedDateTimeToUtc(parts: ZonedDateParts, timeZone: string) {
  let timestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const represented = getZonedDateParts(new Date(timestamp), timeZone);
    const representedAsUtc = Date.UTC(
      represented.year,
      represented.month - 1,
      represented.day,
      represented.hour,
      represented.minute,
      represented.second,
    );
    timestamp += Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ) - representedAsUtc;
  }

  return new Date(timestamp);
}

function atStartOfDay(parts: ZonedDateParts, timeZone: string) {
  return zonedDateTimeToUtc({ ...parts, hour: 0, minute: 0, second: 0 }, timeZone);
}

function monthStart(year: number, month: number, timeZone: string) {
  const normalized = new Date(Date.UTC(year, month - 1, 1));
  return atStartOfDay(
    {
      year: normalized.getUTCFullYear(),
      month: normalized.getUTCMonth() + 1,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
    },
    timeZone,
  );
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthLabel(year: number, month: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone,
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
}

function baseOrderFilter(tenantId: string, warehouseId?: string) {
  return {
    tenantId: new Types.ObjectId(tenantId),
    ...(warehouseId ? { warehouseId: new Types.ObjectId(warehouseId) } : {}),
  };
}

async function validateWarehouse(tenantId: string, warehouseId?: string) {
  if (!warehouseId) return;
  const warehouse = await Warehouse.exists({
    _id: warehouseId,
    tenantId,
    active: true,
  });
  if (!warehouse) {
    const error = new Error("Warehouse not found");
    Object.assign(error, { statusCode: 404, code: "WAREHOUSE_NOT_FOUND" });
    throw error;
  }
}

async function getTenant(tenantId: string) {
  const tenant = await Tenant.findOne({ _id: tenantId, status: "ACTIVE" })
    .select("defaultCurrency timeZone")
    .lean();
  if (!tenant) {
    const error = new Error("Tenant not found");
    Object.assign(error, { statusCode: 404, code: "TENANT_NOT_FOUND" });
    throw error;
  }
  return tenant;
}

function inRange(base: ReturnType<typeof baseOrderFilter>, start: Date, end: Date) {
  return { ...base, createdAt: { $gte: start, $lt: end } };
}

async function countOrders(
  base: ReturnType<typeof baseOrderFilter>,
  start: Date,
  end: Date,
) {
  return Order.countDocuments(inRange(base, start, end));
}

async function averageOrderValue(
  base: ReturnType<typeof baseOrderFilter>,
  start: Date,
  end: Date,
  currency: string,
) {
  const [result] = await Order.aggregate<{ averageMinor: number | null }>([
    {
      $match: {
        ...inRange(base, start, end),
        currency,
        status: { $ne: "CANCELLED" },
      },
    },
    { $group: { _id: null, averageMinor: { $avg: "$totalMinor" } } },
  ]);
  return result?.averageMinor == null ? null : Math.round(result.averageMinor);
}

async function returningCustomerRate(
  base: ReturnType<typeof baseOrderFilter>,
  start?: Date,
  end?: Date,
) {
  const match = {
    ...base,
    status: { $ne: "CANCELLED" },
    ...(start && end ? { createdAt: { $gte: start, $lt: end } } : {}),
  };
  const [result] = await Order.aggregate<{
    customers: number;
    returningCustomers: number;
  }>([
    { $match: match },
    { $group: { _id: "$customerId", orderCount: { $sum: 1 } } },
    {
      $group: {
        _id: null,
        customers: { $sum: 1 },
        returningCustomers: {
          $sum: { $cond: [{ $gt: ["$orderCount", 1] }, 1, 0] },
        },
      },
    },
  ]);
  return result?.customers
    ? Math.round((result.returningCustomers / result.customers) * 1000) / 10
    : null;
}

export async function getDashboardFilters(tenantId: string) {
  const [tenant, warehouses] = await Promise.all([
    getTenant(tenantId),
    Warehouse.find({ tenantId, active: true })
      .select("_id code name")
      .sort({ name: 1 })
      .lean(),
  ]);

  return {
    currency: tenant.defaultCurrency,
    timeZone: tenant.timeZone,
    warehouses: warehouses.map((warehouse) => ({
      id: warehouse._id.toString(),
      code: warehouse.code,
      name: warehouse.name,
    })),
  };
}

export async function getDashboardSummary(tenantId: string, warehouseId?: string) {
  await validateWarehouse(tenantId, warehouseId);
  const tenant = await getTenant(tenantId);
  const now = new Date();
  const localNow = getZonedDateParts(now, tenant.timeZone);
  const dayStart = atStartOfDay(localNow, tenant.timeZone);
  const yesterday = new Date(Date.UTC(localNow.year, localNow.month - 1, localNow.day - 1));
  const yesterdayStart = atStartOfDay(
    {
      year: yesterday.getUTCFullYear(),
      month: yesterday.getUTCMonth() + 1,
      day: yesterday.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
    },
    tenant.timeZone,
  );
  const tomorrow = new Date(Date.UTC(localNow.year, localNow.month - 1, localNow.day + 1));
  const tomorrowStart = atStartOfDay(
    {
      year: tomorrow.getUTCFullYear(),
      month: tomorrow.getUTCMonth() + 1,
      day: tomorrow.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
    },
    tenant.timeZone,
  );
  const thisMonthStart = monthStart(localNow.year, localNow.month, tenant.timeZone);
  const previousMonthDate = new Date(Date.UTC(localNow.year, localNow.month - 2, 1));
  const previousMonthStart = monthStart(
    previousMonthDate.getUTCFullYear(),
    previousMonthDate.getUTCMonth() + 1,
    tenant.timeZone,
  );
  const comparisonMonthEnd = zonedDateTimeToUtc(
    {
      ...localNow,
      year: previousMonthDate.getUTCFullYear(),
      month: previousMonthDate.getUTCMonth() + 1,
      day: Math.min(
        localNow.day,
        new Date(
          Date.UTC(
            previousMonthDate.getUTCFullYear(),
            previousMonthDate.getUTCMonth() + 1,
            0,
          ),
        ).getUTCDate(),
      ),
    },
    tenant.timeZone,
  );
  const thisYearStart = monthStart(localNow.year, 1, tenant.timeZone);
  const previousYearStart = monthStart(localNow.year - 1, 1, tenant.timeZone);
  const comparisonYearEnd = zonedDateTimeToUtc(
    {
      ...localNow,
      year: localNow.year - 1,
      day: Math.min(
        localNow.day,
        new Date(Date.UTC(localNow.year - 1, localNow.month, 0)).getUTCDate(),
      ),
    },
    tenant.timeZone,
  );
  const base = baseOrderFilter(tenantId, warehouseId);

  const [
    ordersToday,
    ordersYesterday,
    ordersMonth,
    ordersPreviousMonth,
    ordersYear,
    ordersPreviousYear,
    averageOrderValueMinor,
    returningCustomerRateMonth,
    returningCustomerRateAllTime,
    shipped,
    delivered,
    outOfStockInventoryPositions,
  ] = await Promise.all([
    countOrders(base, dayStart, now),
    countOrders(base, yesterdayStart, dayStart),
    countOrders(base, thisMonthStart, now),
    countOrders(base, previousMonthStart, comparisonMonthEnd),
    countOrders(base, thisYearStart, now),
    countOrders(base, previousYearStart, comparisonYearEnd),
    averageOrderValue(base, thisMonthStart, now, tenant.defaultCurrency),
    returningCustomerRate(base, thisMonthStart, now),
    returningCustomerRate(base),
    Order.countDocuments({ ...base, status: "SHIPPED" }),
    Order.countDocuments({ ...base, status: "DELIVERED" }),
    Inventory.countDocuments({
      tenantId,
      ...(warehouseId ? { warehouseId } : {}),
      $expr: { $lte: ["$available", "$reserved"] },
    }),
  ]);

  return {
    generatedAt: now.toISOString(),
    currency: tenant.defaultCurrency,
    timeZone: tenant.timeZone,
    metrics: {
      ordersToday,
      ordersYesterday,
      ordersThisMonth: ordersMonth,
      ordersPreviousMonth,
      ordersThisYear: ordersYear,
      ordersPreviousYear,
      averageOrderValueMinor,
      returningCustomerRateMonth,
      returningCustomerRateAllTime,
      codMinor: null,
      lostCodMinor: null,
    },
    delivery: {
      delivered,
      inTransit: shipped,
      trackedTotal: delivered + shipped,
      deliveryRate:
        delivered + shipped > 0
          ? Math.round((delivered / (delivered + shipped)) * 1000) / 10
          : null,
      returns: null,
      trackingConfigured: false,
    },
    actions: {
      outOfStockInventoryPositions,
      merchantCorrection: null,
      vendorValidation: null,
      ordersWithoutAwb: null,
      outOfStockOrders: null,
    },
  };
}

export async function getDashboardTimeseries(tenantId: string, warehouseId?: string) {
  await validateWarehouse(tenantId, warehouseId);
  const tenant = await getTenant(tenantId);
  const now = new Date();
  const localNow = getZonedDateParts(now, tenant.timeZone);
  const currentMonth = localNow.month;
  const currentYear = localNow.year;
  const firstMonth = monthStart(currentYear, currentMonth - 23, tenant.timeZone);
  const endMonth = monthStart(currentYear, currentMonth + 1, tenant.timeZone);
  const base = baseOrderFilter(tenantId, warehouseId);

  const grouped = await Order.aggregate<{
    _id: string;
    orders: number;
    revenueMinor: number;
  }>([
    {
      $match: {
        ...base,
        createdAt: { $gte: firstMonth, $lt: endMonth },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m",
            date: "$createdAt",
            timezone: tenant.timeZone,
          },
        },
        orders: { $sum: 1 },
        revenueMinor: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$currency", tenant.defaultCurrency] },
                  { $ne: ["$status", "CANCELLED"] },
                ],
              },
              "$totalMinor",
              0,
            ],
          },
        },
      },
    },
  ]);

  const values = new Map(grouped.map((entry) => [entry._id, entry]));
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(currentYear, currentMonth - 12 + index, 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const currentKey = monthKey(year, month);
    const previousKey = monthKey(year - 1, month);
    const current = values.get(currentKey);
    const previous = values.get(previousKey);
    return {
      month: currentKey,
      label: monthLabel(year, month, tenant.timeZone),
      orders: current?.orders ?? 0,
      revenueMinor: current?.revenueMinor ?? 0,
      previousYearOrders: previous?.orders ?? 0,
      previousYearRevenueMinor: previous?.revenueMinor ?? 0,
    };
  });

  return { currency: tenant.defaultCurrency, months };
}
