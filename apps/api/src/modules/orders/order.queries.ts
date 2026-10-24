import { Types } from "mongoose";
import { Shipment } from "../fulfillment/shipment.model.js";
import { User } from "../identity/user.model.js";
import { Order } from "./order.model.js";

type OrderLike = Record<string, any>;

export async function serializeOrders(tenantId: string, orders: OrderLike[]) {
  const orderIds = orders.map((order) => order._id);
  const customerIds = [...new Set(orders.map((order) => order.customerId.toString()))];

  const [shipments, customers] = await Promise.all([
    Shipment.find({ tenantId, orderId: { $in: orderIds } }).lean(),
    User.find({ tenantId, _id: { $in: customerIds } }).select("firstName lastName").lean(),
  ]);
  const shipmentByOrder = new Map(shipments.map((shipment) => [shipment.orderId.toString(), shipment]));
  const customerById = new Map(customers.map((customer) => [customer._id.toString(), customer]));

  return orders.map((order) => {
    const shipment = shipmentByOrder.get(order._id.toString());
    const customer = customerById.get(order.customerId.toString());
    return {
      id: order._id.toString(),
      status: order.status,
      paymentStatus: order.paymentStatus ?? "UNPAID",
      paymentMethod: order.paymentMethod ?? null,
      paymentReference: order.paymentReference ?? null,
      paymentSummary: order.paymentSummary ?? null,
      paidAt: order.paidAt ?? null,
      totalMinor: order.totalMinor,
      currency: order.currency,
      warehouseId: order.warehouseId.toString(),
      customerId: order.customerId.toString(),
      customerName: customer ? `${customer.firstName} ${customer.lastName}` : "",
      createdAt: order.createdAt,
      items: order.items.map((item: OrderLike) => ({
        productId: item.productId.toString(),
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
      })),
      shipment: shipment
        ? {
            carrier: shipment.carrier,
            trackingNumber: shipment.trackingNumber,
            status: shipment.status,
            events: shipment.events.map((event) => ({
              status: event.status,
              note: event.note,
              at: event.at,
            })),
          }
        : null,
    };
  });
}

export async function listOrders(
  tenantId: string,
  filter: { customerId?: string; status?: string; limit: number },
) {
  const orders = await Order.find({
    tenantId: new Types.ObjectId(tenantId),
    ...(filter.customerId ? { customerId: new Types.ObjectId(filter.customerId) } : {}),
    ...(filter.status ? { status: filter.status } : {}),
  } as Record<string, unknown>)
    .sort({ createdAt: -1 })
    .limit(filter.limit)
    .lean();
  return serializeOrders(tenantId, orders);
}
