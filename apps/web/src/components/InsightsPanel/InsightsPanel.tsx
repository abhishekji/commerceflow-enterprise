import { useState } from "react";
import { IconName } from "../../common/enums";
import { aiService } from "../../services";
import { errorMessage } from "../../utils/errors";
import { Icon } from "../Icon";
import "./InsightsPanel.scss";

export function InsightsPanel({ warehouseId }: { warehouseId: string }) {
  const [insights, setInsights] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      setInsights((await aiService.insights(warehouseId)).insights);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel insights-panel" aria-label="AI insights">
      <div className="insights-header">
        <h2><Icon name={IconName.Sparkle} size={18} />AI Insights</h2>
        <button type="button" className="btn" onClick={generate} disabled={loading}>
          {loading ? "Analyzing…" : insights ? "Refresh" : "Generate"}
        </button>
      </div>
      {error && <p className="insights-error" role="alert">{error}</p>}
      {insights
        ? <p className="insights-body">{insights}</p>
        : !error && <p className="insights-empty">Generate a short AI summary of the metrics for the selected warehouse.</p>}
    </section>
  );
}
