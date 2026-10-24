import { useEffect, useRef, useState } from "react";
import { NOTIFICATIONS_POLL_INTERVAL_MS, STORAGE_KEYS } from "../../common/constants";
import { IconName } from "../../common/enums";
import type { NotificationItem } from "../../common/types";
import { usePolling } from "../../hooks";
import { notificationService } from "../../services";
import { formatDate } from "../../utils/format";
import { Icon } from "../Icon";
import "./NotificationsMenu.scss";

export function NotificationsMenu() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState(() => Number(sessionStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_SEEN) || 0));
  const menuRef = useRef<HTMLDivElement>(null);

  usePolling(
    () => notificationService.list().then(setItems).catch(() => {}),
    NOTIFICATIONS_POLL_INTERVAL_MS,
  );

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const unread = items.filter((item) => new Date(item.createdAt).getTime() > seenAt).length;

  function toggle() {
    if (!open && items.length) {
      const latest = new Date(items[0]!.createdAt).getTime();
      sessionStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_SEEN, String(latest));
      setSeenAt(latest);
    }
    setOpen(!open);
  }

  return (
    <div className="notifications" ref={menuRef}>
      <button className="icon-button" aria-label={`Notifications${unread ? ` (${unread} new)` : ""}`} aria-expanded={open} onClick={toggle}>
        <Icon name={IconName.Bell} size={17} />
        {unread > 0 && <b className="notification-dot">{unread > 9 ? "9+" : unread}</b>}
      </button>
      {open && (
        <div className="notification-menu" role="region" aria-label="Notifications">
          {items.length === 0 ? <p className="empty-state">No notifications yet.</p> : (
            <ul>{items.map((item) => <li key={item.id}>{item.message}<small>{formatDate(item.createdAt)}</small></li>)}</ul>
          )}
        </div>
      )}
    </div>
  );
}
