import { IconName } from "../../common/enums";
import type { DashboardSummary } from "../../common/types";
import { buildActionItems } from "../../utils/dashboard";
import { formatCount } from "../../utils/format";
import { Icon } from "../Icon";
import "./ActionPanel.scss";

export function ActionPanel({ actions }: { actions: DashboardSummary["actions"] }) {
  return (
    <section className="panel action-panel">
      <div className="action-column action-orders">
        <div className="panel-title"><Icon name={IconName.Warning} size={16} /><span>Orders Requiring Action</span></div>
        <div className="action-list">
          {buildActionItems(actions).map((item) => (
            <div className="action-item" key={item.label}>
              <span className={`action-icon ${item.tone}`}><Icon name={item.icon} size={13} /></span>
              <span>{item.label}</span>
              <strong className={item.tone}>{item.count == null ? "N/A" : formatCount(item.count)}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="action-column stock-products">
        <div className="panel-title"><span className="stock-symbol">◇</span><span>Out of Stock Products</span></div>
        <p>{formatCount(actions.outOfStockInventoryPositions)} inventory positions</p>
      </div>
      <div className="action-column forecast">
        <div className="panel-title"><Icon name={IconName.Calendar} size={15} /><span>Out of Stock Forecast</span></div>
        <p>Forecast data isn't available</p>
      </div>
    </section>
  );
}
