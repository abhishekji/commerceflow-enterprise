import type { MetricCardData } from "../../common/types";
import { Icon } from "../Icon";
import "./MetricCard.scss";

export function MetricCard({ metric }: { metric: MetricCardData }) {
  return (
    <article className="metric-card">
      <div className="metric-icon"><Icon name={metric.icon} size={16} /></div>
      <div className="metric-copy">
        <p className="metric-label">{metric.label}</p>
        <strong>{metric.value}</strong>
        <span>{metric.note}</span>
      </div>
    </article>
  );
}
