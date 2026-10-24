import { BODY_CLASSES } from "../../common/constants";
import { IconName } from "../../common/enums";
import { useAuth } from "../../context/AuthContext";
import { useNotice } from "../../context/NoticeContext";
import { toggleBodyClass } from "../../utils/dom";
import { Icon } from "../Icon";
import { NotificationsMenu } from "../NotificationsMenu";
import "./Topbar.scss";

export function Topbar() {
  const { session } = useAuth();
  const { showNotice } = useNotice();
  if (!session) return null;
  const { user, tenant } = session;

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <button className="icon-button collapse-button" aria-label="Toggle sidebar" onClick={() => toggleBodyClass(BODY_CLASSES.SIDEBAR_COLLAPSED)}>
          <Icon name={IconName.Menu} size={17} />
        </button>
        <span className="company-icon">▦</span><span>{tenant.name}</span>
      </div>
      <div className="topbar-actions">
        <button className="feedback-button" onClick={() => showNotice("Feedback isn't connected to a service yet.")}>
          <Icon name={IconName.Feedback} size={15} />Feedback
        </button>
        <NotificationsMenu />
        <button className="icon-button" aria-label="Toggle theme" onClick={() => toggleBodyClass(BODY_CLASSES.LIGHT_THEME)}>
          <Icon name={IconName.Sun} size={17} />
        </button>
        <button className="profile-button" aria-label={`Profile: ${user.firstName} ${user.lastName}`}         onClick={() => showNotice(`Signed in as ${user.firstName} ${user.lastName}.`)}>
                  <Icon name={IconName.Users} size={15} />
        </button>
      </div>
    </header>
  );
}
