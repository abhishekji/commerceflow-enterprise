import { Fragment, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CUSTOMER_ORDER_ACTIONS, ORDER_STATUS_LABELS, ORDERS_POLL_INTERVAL_MS, PAYMENT_STATUS_LABELS, STAFF_ORDER_ACTIONS, orderPayPath,
} from "../../common/constants";
import { OrderStatus, PaymentStatus, UserRole } from "../../common/enums";
import type { Order } from "../../common/types";
import { PageHeading } from "../../components/PageHeading";
import { OrderStatusBadge, PaymentStatusBadge } from "../../components/StatusBadge";
import { useSession } from "../../context/AuthContext";
import { usePolling } from "../../hooks";
import { orderService } from "../../services";
import { errorMessage } from "../../utils/errors";
import { formatCurrency, formatDate } from "../../utils/format";
import { orderLabel } from "../../utils/text";
import "./OrdersPage.scss";

export function OrdersPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [expanded, setExpanded] = useState("");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const isCustomer = session.user.role === UserRole.Customer;
  const actions = isCustomer ? CUSTOMER_ORDER_ACTIONS : STAFF_ORDER_ACTIONS;

  const load = useCallback(async () => {
    try {
      setOrders(await orderService.list(statusFilter));
    } catch (err) {
      setError(errorMessage(err));
      setOrders((current) => current ?? []);
    }
  }, [statusFilter]);

  // Background workers update orders asynchronously, so poll while the page is open.
  usePolling(load, ORDERS_POLL_INTERVAL_MS, [load]);

  async function changeStatus(order: Order, status: OrderStatus) {
    setBusyId(order.id);
    setError("");
    try {
      const updated = await orderService.transition(order.id, status);
      setOrders((current) => (current ?? []).map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(errorMessage(err));
      void load();
    } finally {
      setBusyId("");
    }
  }

  if (orders === null) return <p role="status">Loading orders…</p>;

  return (
    <>
      <PageHeading title="All Orders" subtitle="All Orders overview" />
      <section className="panel page-panel">
        <div className="panel-toolbar">
          <h2>{isCustomer ? "My orders" : "All orders"}</h2>
          <label className="inline-field">Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as OrderStatus | "")}>
              <option value="">All</option>
              {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        {error && <div className="dashboard-error page-message" role="alert">{error}</div>}
        {orders.length === 0 ? <p className="empty-state">No orders yet. Place one from Browse Products.</p> : (
          <table className="data-table">
            <thead><tr><th>Order</th>{!isCustomer && <th>Customer</th>}<th>Items</th><th>Total</th><th>Status</th><th>Payment</th><th>Tracking</th><th>Placed</th><th /></tr></thead>
            <tbody>
              {orders.map((order) => (
                <Fragment key={order.id}>
                  <tr>
                    <td><button className="link-inline" onClick={() => setExpanded(expanded === order.id ? "" : order.id)} aria-expanded={expanded === order.id}>{orderLabel(order.id)}</button></td>
                    {!isCustomer && <td>{order.customerName}</td>}
                    <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                    <td>{formatCurrency(order.totalMinor, order.currency)}</td>
                    <td><OrderStatusBadge status={order.status} /></td>
                    <td><PaymentStatusBadge status={order.paymentStatus} /></td>
                    <td>{order.shipment?.trackingNumber ?? "—"}</td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td className="row-actions">
                      {isCustomer && order.status === OrderStatus.Pending && order.paymentStatus === PaymentStatus.Unpaid && (
                        <button className="btn btn-primary" onClick={() => navigate(orderPayPath(order.id))}>Pay now</button>
                      )}
                      {(actions[order.status] ?? [])
                        .filter(([status]) => !(status === OrderStatus.Confirmed && order.paymentStatus === PaymentStatus.Unpaid))
                        .map(([status, label]) => (
                          <button key={status} className={`btn ${status === OrderStatus.Cancelled ? "btn-danger" : ""}`} disabled={busyId === order.id} onClick={() => changeStatus(order, status)}>{label}</button>
                        ))}
                    </td>
                  </tr>
                  {expanded === order.id && (
                    <tr className="detail-row">
                      <td colSpan={isCustomer ? 8 : 9}>
                        <div className="order-detail">
                          <div>
                            <h3>Items</h3>
                            <ul>{order.items.map((item) => <li key={item.productId}>{item.name} ({item.sku}) × {item.quantity} — {formatCurrency(item.unitPriceMinor * item.quantity, order.currency)}</li>)}</ul>
                          </div>
                          <div>
                            <h3>Payment</h3>
                            <p>{PAYMENT_STATUS_LABELS[order.paymentStatus]}{order.paymentSummary ? ` · ${order.paymentSummary}` : ""}</p>
                            {order.paymentReference && <p><small>Ref {order.paymentReference}{order.paidAt ? ` · ${formatDate(order.paidAt)}` : ""}</small></p>}
                          </div>
                          <div>
                            <h3>Shipment{order.shipment ? ` · ${order.shipment.carrier}` : ""}</h3>
                            {order.shipment ? (
                              <ol className="timeline">
                                {order.shipment.events.map((event) => <li key={`${event.status}-${event.at}`}><strong>{event.status.replace("_", " ")}</strong> {event.note}<small>{formatDate(event.at)}</small></li>)}
                              </ol>
                            ) : <p className="empty-state">A shipment is requested once the order is confirmed.</p>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
