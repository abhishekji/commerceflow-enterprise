import { IconName } from "../../common/enums";
import { Icon } from "../Icon";
import "./NewsPanel.scss";

export function NewsPanel() {
  return (
    <section className="panel news-panel">
      <div className="news-header"><h2><Icon name={IconName.Bell} size={18} />Latest News</h2></div>
      <p className="news-unavailable">Announcements aren't configured for this workspace yet.</p>
    </section>
  );
}
