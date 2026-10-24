import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "../../common/constants";
import { OrderStatus, PaymentStatus } from "../../common/enums";
import type { Order } from "../../common/types";
import { PageHeading } from "../../components/PageHeading";
import { PaymentPanel } from "../../components/PaymentPanel";
import { useNotice } from "../../context/NoticeContext";
import { orderService } from "../../services";
import { errorMessage } from "../../utils/errors";
import { orderLabel } from "../../utils/text";

export function PaymentPage() {
  const { orderId = "" } = useParams();
  const navigate = useNavigate();
  const { showNotice } = useNotice();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    orderService.get(orderId)
      .then((data) => current && setOrder(data))
      .catch((err) => current && setError(errorMessage(err)));
    return () => { current = false; };
  }, [orderId]);

  function leave() {
    if (order && order.paymentStatus === PaymentStatus.Unpaid) {
      showNotice(`Order ${orderLabel(order.id)} is awaiting payment. Pay from All Orders before it can be confirmed.`);
    }
    navigate(ROUTES.ORDERS);
  }

  async function cancelOrder() {
    if (!order) return;
    try {
      await orderService.transition(order.id, OrderStatus.Cancelled);
      showNotice(`Order ${orderLabel(order.id)} was cancelled and the stock released.`);
      navigate(ROUTES.SHOP);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeading title="Payment" subtitle="Complete payment to confirm your order" />
      {error && <div className="dashboard-error page-message" role="alert">{error}</div>}
      {!order && !error && <p role="status">Loading order…</p>}
      {!order && error && <Link className="link-inline" to={ROUTES.ORDERS}>Back to orders</Link>}
      {order && (
        <PaymentPanel
          order={order}
          onPaid={setOrder}
          onLater={leave}
          onCancelOrder={order.paymentStatus === PaymentStatus.Unpaid ? cancelOrder : undefined}
        />
      )}
    </>
  );
}
