import { useEffect, useState } from "react";
import { DASHBOARD_MESSAGES } from "../../common/constants";
import { HttpStatus, IconName } from "../../common/enums";
import type { DashboardFilters, DashboardSummary, DashboardTimeseries } from "../../common/types";
import { ActionPanel } from "../../components/ActionPanel";
import { DeliveryCard } from "../../components/DeliveryCard";
import { Icon } from "../../components/Icon";
import { MetricCard } from "../../components/MetricCard";
import { NewsPanel } from "../../components/NewsPanel";
import { PageHeading } from "../../components/PageHeading";
import { VolumeChart } from "../../components/VolumeChart";
import { useAuth } from "../../context/AuthContext";
import { dashboardService } from "../../services";
import { buildMetrics } from "../../utils/dashboard";
import { errorStatus } from "../../utils/errors";
import "./DashboardPage.scss";

export function DashboardPage() {
  const { expireSession } = useAuth();
  const [warehouseId, setWarehouseId] = useState("");
  const [compare, setCompare] = useState(true);
  const [trend, setTrend] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [timeseries, setTimeseries] = useState<DashboardTimeseries | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    dashboardService.filters()
      .then((data) => current && setFilters(data))
      .catch(() => current && setError(DASHBOARD_MESSAGES.FILTERS_FAILED));
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    Promise.all([dashboardService.summary(warehouseId), dashboardService.timeseries(warehouseId)])
      .then(([summary, chart]) => {
        if (!current) return;
        setDashboard(summary);
        setTimeseries(chart);
      })
      .catch((err) => {
        if (!current) return;
        const expired = errorStatus(err) === HttpStatus.Unauthorized;
        setDashboard(null);
        setError(expired ? DASHBOARD_MESSAGES.SESSION_EXPIRED : DASHBOARD_MESSAGES.DATA_FAILED);
        if (expired) expireSession();
      })
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [warehouseId, expireSession]);

  return (
    <>
      <PageHeading title="Dashboard" subtitle="Overview of your fulfillment operations">
        <label className="select-wrap">
          <Icon name={IconName.Warehouse} size={15} />
          <select aria-label="Filter by warehouse" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>
            <option value="">All Warehouses</option>
            {(filters?.warehouses ?? []).map((warehouse) => <option value={warehouse.id} key={warehouse.id}>{warehouse.name}</option>)}
          </select>
          <Icon name={IconName.Down} size={14} />
        </label>
      </PageHeading>

      {error && <div className="dashboard-error" role="alert">{error}</div>}
      {loading && <p className="dashboard-loading" role="status">Loading dashboard data…</p>}

      <div className="dashboard-grid">
        {dashboard && <DeliveryCard delivery={dashboard.delivery} />}
        <div className="overview-column">
          <section className="metrics-grid" aria-label="Key fulfillment metrics">
            {(dashboard ? buildMetrics(dashboard) : []).map((metric) => <MetricCard metric={metric} key={metric.label} />)}
          </section>
          {dashboard && <ActionPanel actions={dashboard.actions} />}
        </div>
      </div>

      <div className="lower-grid">
        <section className="panel volume-panel">
          <div className="volume-header">
            <div><h2>12-Month Order Volume</h2><p>Monthly orders <small>compared with the same months last year</small></p></div>
            <div className="chart-controls">
              <button className={trend ? "selected" : ""} onClick={() => setTrend(!trend)}><Icon name={IconName.Chart} size={15} />Trend</button>
              <button className={compare ? "selected" : ""} onClick={() => setCompare(!compare)}><Icon name={IconName.Bars} size={15} />YoY Compare</button>
            </div>
          </div>
          {timeseries && <VolumeChart compare={compare} trend={trend} series={timeseries.months} />}
        </section>
        <NewsPanel />
      </div>
    </>
  );
}
