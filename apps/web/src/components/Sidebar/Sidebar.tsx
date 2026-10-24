import { NavLink } from "react-router-dom";
import { NAV_GROUPS } from "../../common/constants";
import { IconName } from "../../common/enums";
import { useAuth } from "../../context/AuthContext";
import { useNotice } from "../../context/NoticeContext";
import { Icon } from "../Icon";
import "./Sidebar.scss";

export function Sidebar() {
  const { session, logout, loggingOut } = useAuth();
  const { showNotice } = useNotice();
  if (!session) return null;

  async function handleLogout() {
    if (loggingOut) return;
    const ok = await logout();
    if (!ok) showNotice("Could not sign out. Please try again.");
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">ba</div>
        <div className="brand-wordmark"><strong>BIGARENA</strong><span>FULFILLMENT</span></div>
      </div>
      <nav className="navigation" aria-label="Main navigation">
        {NAV_GROUPS.map((group) => (
          <div className="nav-group" key={group.title}>
            <p className="nav-heading">{group.title}</p>
            {group.title === "Navigation" && (
              <button className="return-button" onClick={() => showNotice("Main system is not connected in this preview.")}>
                <Icon name={IconName.Return} size={16} />Return to main system
              </button>
            )}
            {group.links.map((link) => (
              <NavLink to={link.path} key={link.path} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                <Icon name={link.icon} size={16} /><span>{link.label}</span>
                {link.badge && <b className="nav-badge">{link.badge}</b>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="account-button">
        <span className="account-avatar">{session.user.firstName.slice(0, 1)}{session.user.lastName.slice(0, 1)}</span>
        <span className="account-copy"><strong>{session.tenant.name}</strong><small>{session.user.role.replaceAll("_", " ")}</small></span>
      </div>
      <button className="logout-button" onClick={handleLogout} disabled={loggingOut} title="Sign out">
        <Icon name={IconName.Return} size={16} /><span>{loggingOut ? "Signing out…" : "Sign out"}</span>
      </button>
    </aside>
  );
}
