import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "../../common/constants";
import type { OrderStatus, PaymentStatus } from "../../common/enums";
import "./StatusBadge.scss";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{ORDER_STATUS_LABELS[status]}</span>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <span className={`badge badge-pay-${status.toLowerCase()}`}>{PAYMENT_STATUS_LABELS[status]}</span>;
}

export function OutOfStockBadge() {
  return <span className="badge badge-cancelled">Out of stock</span>;
}
