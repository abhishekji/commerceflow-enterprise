import { IconName } from "../../common/enums";
import type { DeliverySummary } from "../../common/types";
import { formatCount, formatPercent } from "../../utils/format";
import { Icon } from "../Icon";
import "./DeliveryCard.scss";

export function DeliveryCard({ delivery }: { delivery: DeliverySummary }) {
  const deliveryRate = delivery.deliveryRate ?? 0;
  return (
    <section className="panel delivery-card">
      <div className="delivery-heading">
        <span className="delivery-truck"><Icon name={IconName.Truck} size={17} /></span>
        <h2>Delivery<br />Performance</h2>
        <small>{delivery.trackingConfigured ? "(All Time)" : "(Order status only)"}</small>
      </div>
      <div
        className="delivery-ring"
        style={{ background: `conic-gradient(var(--green) 0deg ${deliveryRate * 3.6}deg, #3a3d3e ${deliveryRate * 3.6}deg 360deg)` }}
      >
        <div>
          <strong>{formatPercent(delivery.deliveryRate)}</strong>
          <span>Delivery Rate</span>
          <small>{delivery.trackingConfigured ? "(tracked shipments)" : "(tracking not configured)"}</small>
        </div>
      </div>
      <div className="delivery-stats">
        <div><i className="dot green" /><strong>{formatCount(delivery.delivered)}</strong><span>Delivered</span></div>
        <div><i className="dot yellow" /><strong>{formatCount(delivery.inTransit)}</strong><span>Shipped</span></div>
        <div><i className="dot green" /><strong>{delivery.returns == null ? "N/A" : formatCount(delivery.returns)}</strong><span>Returned</span></div>
      </div>
      <p className="delivery-total">Orders with status: <strong>{formatCount(delivery.trackedTotal)}</strong></p>
    </section>
  );
}
