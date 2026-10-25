import type { ReactNode } from "react";
import { IconName } from "../../common/enums";

interface IconProps {
  name: IconName;
  size?: number;
}

const PATHS: Record<IconName, ReactNode> = {
  [IconName.Grid]: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
  [IconName.Cart]: <><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M3 4h2l2.6 11.2a2 2 0 0 0 2 1.5h8.6a2 2 0 0 0 1.9-1.4L22 8H6" /></>,
  [IconName.Return]: <><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-2" /></>,
  [IconName.Clipboard]: <><rect x="5" y="5" width="14" height="16" rx="2" /><path d="M9 5.5V4h6v1.5M9 10h6M9 14h6M9 18h3" /></>,
  [IconName.Box]: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.5 7.5 4 7.5-4M12 12v9M8 5l8 4.5" /></>,
  [IconName.Truck]: <><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" /><circle cx="7.5" cy="18" r="1.5" /><circle cx="18" cy="18" r="1.5" /></>,
  [IconName.Users]: <path d="M16 20v-1.5a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4V20M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 20v-1.5a4 4 0 0 0-3-3.9M16 3.2a4 4 0 0 1 0 7.6" />,
  [IconName.Megaphone]: <path d="m4 11 15-6v14L4 13zM4 11v2M8 14l2 6h4l-2-4M19 10h2a2 2 0 0 1 0 4h-2" />,
  [IconName.Pin]: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  [IconName.Trend]: <><path d="m4 16 6-6 4 3 6-7" /><path d="M14 6h6v6" /></>,
  [IconName.Bars]: <path d="M5 20V10M10 20V4M15 20v-7M20 20V7M3 20h19" />,
  [IconName.Money]: <path d="M12 2v20M17 6H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6" />,
  [IconName.Warning]: <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v5M12 17h.01" /></>,
  [IconName.Square]: <><rect x="5" y="4" width="14" height="16" rx="3" /><path d="M10 9h4v6h-4z" /></>,
  [IconName.Clock]: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  [IconName.Bell]: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />,
  [IconName.Sun]: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  [IconName.Warehouse]: <path d="m3 10 9-7 9 7v10H3zM9 20v-6h6v6M7 10h.01M12 10h.01M17 10h.01" />,
  [IconName.Store]: <path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6" />,
  [IconName.Chart]: <path d="M4 19V5M4 19h17M7 15l4-4 3 2 5-7M15 6h4v4" />,
  [IconName.Calendar]: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M12 14v3" /></>,
  [IconName.Menu]: <path d="M4 6h16M4 12h16M4 18h16" />,
  [IconName.Chevron]: <path d="m9 18 6-6-6-6" />,
  [IconName.Down]: <path d="m7 10 5 5 5-5" />,
  [IconName.Feedback]: <path d="M20 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />,
  [IconName.Sparkle]: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
};

export function Icon({ name, size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-icon={name}
    >
      {PATHS[name] ?? PATHS[IconName.Grid]}
    </svg>
  );
}
