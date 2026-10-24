import type { TimeseriesMonth } from "../../common/types";
import { chartPoints, seriesMax } from "../../utils/dashboard";
import { formatCount } from "../../utils/format";
import "./VolumeChart.scss";

interface VolumeChartProps {
  compare: boolean;
  trend: boolean;
  series: TimeseriesMonth[];
}

export function VolumeChart({ compare, trend, series }: VolumeChartProps) {
  const currentOrders = series.map((month) => month.orders);
  const previousOrders = series.map((month) => month.previousYearOrders);
  const maxOrders = seriesMax(series, compare);
  return (
    <div className="chart-area">
      <div className="chart-y-labels"><span>{formatCount(maxOrders)}</span><span>0</span></div>
      <div className="chart-plot">
        <div className="chart-grid"><i /><i /><i /><i /></div>
        <svg className="line-chart" viewBox="0 0 638 120" preserveAspectRatio="none" role="img" aria-label="Monthly order counts and prior-year comparison">
          {compare && <polyline points={chartPoints(previousOrders, maxOrders)} className="chart-line muted-line" />}
          {trend && <polyline points={chartPoints(currentOrders, maxOrders)} className="chart-line" />}
        </svg>
        <div className="chart-months">{series.map((month) => <span key={month.month}>{month.label}</span>)}</div>
      </div>
      <div className="chart-right-labels"><span>Orders</span><span /></div>
    </div>
  );
}
