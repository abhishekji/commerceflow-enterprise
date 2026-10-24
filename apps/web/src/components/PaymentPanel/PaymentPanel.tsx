import { useState, type FormEvent } from "react";
import { BANK_OPTIONS, PAYMENT_METHOD_OPTIONS, SANDBOX_HINT, WALLET_OPTIONS } from "../../common/constants";
import { PaymentMethod, PaymentStatus } from "../../common/enums";
import type { Order, PaymentPayload, PaymentResult } from "../../common/types";
import { paymentService } from "../../services";
import { errorMessage } from "../../utils/errors";
import { formatCurrency } from "../../utils/format";
import { formatCardNumber, formatExpiry, orderLabel } from "../../utils/text";
import "./PaymentPanel.scss";

interface PaymentPanelProps {
  order: Order;
  onPaid?: (order: Order) => void;
  onLater: () => void;
  onCancelOrder?: () => void;
}

const EMPTY_CARD = { cardholderName: "", cardNumber: "", expiry: "", cvv: "" };

export function PaymentPanel({ order, onPaid, onLater, onCancelOrder }: PaymentPanelProps) {
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.Card);
  const [card, setCard] = useState(EMPTY_CARD);
  const [upiId, setUpiId] = useState("");
  const [bank, setBank] = useState(BANK_OPTIONS[0]!.value);
  const [wallet, setWallet] = useState(WALLET_OPTIONS[0]!.value);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<PaymentResult | null>(null);

  function buildPayload(): PaymentPayload {
    switch (method) {
      case PaymentMethod.Card: return { method, ...card };
      case PaymentMethod.Upi: return { method, upiId: upiId.trim() };
      case PaymentMethod.NetBanking: return { method, bank };
      case PaymentMethod.Wallet: return { method, wallet };
      default: return { method: PaymentMethod.CashOnDelivery };
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPaying(true);
    setError("");
    try {
      const result = await paymentService.pay(order.id, buildPayload());
      setReceipt(result);
      onPaid?.(result.order);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPaying(false);
    }
  }

  if (receipt) {
    const cod = receipt.order.paymentStatus === PaymentStatus.CashOnDelivery;
    return (
      <section className="panel page-panel payment-panel">
        <div className="success-message page-message" role="status">
          {cod ? "Order confirmed — pay on delivery." : "Payment successful."}
        </div>
        <h2>Order {orderLabel(order.id)}</h2>
        <dl className="payment-summary">
          <dt>Amount</dt><dd>{formatCurrency(order.totalMinor, order.currency)}{cod ? " (due on delivery)" : ""}</dd>
          <dt>Method</dt><dd>{receipt.order.paymentSummary}</dd>
          <dt>Reference</dt><dd>{receipt.reference}</dd>
        </dl>
        <p className="empty-state">Your order is being confirmed. Track it under All Orders.</p>
        <button className="btn btn-primary" onClick={onLater}>Done</button>
      </section>
    );
  }

  return (
    <section className="panel page-panel payment-panel">
      <div className="panel-toolbar">
        <h2>Payment · Order {orderLabel(order.id)}</h2>
        <strong>{formatCurrency(order.totalMinor, order.currency)}</strong>
      </div>
      <div className="sandbox-banner" role="note">{SANDBOX_HINT}</div>

      <ul className="order-summary">
        {order.items.map((item) => (
          <li key={item.productId}><span>{item.name} × {item.quantity}</span><span>{formatCurrency(item.unitPriceMinor * item.quantity, order.currency)}</span></li>
        ))}
      </ul>

      <form className="payment-form" onSubmit={submit}>
        <div className="method-list" role="radiogroup" aria-label="Payment method">
          {PAYMENT_METHOD_OPTIONS.map((item) => (
            <label key={item.id} className={`method-option ${method === item.id ? "selected" : ""}`}>
              <input type="radio" name="method" value={item.id} checked={method === item.id} onChange={() => { setMethod(item.id); setError(""); }} />
              {item.label}
            </label>
          ))}
        </div>

        {error && <div className="dashboard-error page-message" role="alert">{error}</div>}

        {method === PaymentMethod.Card && (
          <div className="form-stack">
            <label>Name on card
              <input required autoComplete="cc-name" value={card.cardholderName} onChange={(e) => setCard({ ...card, cardholderName: e.target.value })} />
            </label>
            <label>Card number
              <input required inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" value={card.cardNumber} onChange={(e) => setCard({ ...card, cardNumber: formatCardNumber(e.target.value) })} />
            </label>
            <div className="form-columns">
              <label>Expiry (MM/YY)
                <input required inputMode="numeric" autoComplete="cc-exp" placeholder="12/30" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })} />
              </label>
              <label>CVV
                <input required type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })} />
              </label>
            </div>
          </div>
        )}
        {method === PaymentMethod.Upi && (
          <label>UPI ID
            <input required placeholder="name@bank" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
          </label>
        )}
        {method === PaymentMethod.NetBanking && (
          <label>Bank
            <select value={bank} onChange={(e) => setBank(e.target.value)}>{BANK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          </label>
        )}
        {method === PaymentMethod.Wallet && (
          <label>Wallet
            <select value={wallet} onChange={(e) => setWallet(e.target.value)}>{WALLET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          </label>
        )}
        {method === PaymentMethod.CashOnDelivery && <p className="empty-state">Nothing is charged now. Pay when your order is delivered.</p>}

        <div className="row-actions">
          <button className="btn btn-primary" type="submit" disabled={paying}>
            {paying ? "Processing…" : method === PaymentMethod.CashOnDelivery ? "Confirm order" : `Pay ${formatCurrency(order.totalMinor, order.currency)}`}
          </button>
          <button className="btn" type="button" disabled={paying} onClick={onLater}>Pay later</button>
          {onCancelOrder && <button className="btn btn-danger" type="button" disabled={paying} onClick={onCancelOrder}>Cancel order</button>}
        </div>
      </form>
    </section>
  );
}
