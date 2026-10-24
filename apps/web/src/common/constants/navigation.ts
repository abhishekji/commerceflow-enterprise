import { IconName } from "../enums";
import type { NavGroup } from "../types";
import { ROUTES } from "./routes";

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Navigation",
    links: [{ label: "Dashboard", icon: IconName.Grid, path: ROUTES.DASHBOARD }],
  },
  {
    title: "Shop",
    links: [{ label: "Browse Products", icon: IconName.Box, path: ROUTES.SHOP }],
  },
  {
    title: "Orders",
    links: [
      { label: "All Orders", icon: IconName.Cart, path: ROUTES.ORDERS },
      { label: "Returns", icon: IconName.Return, path: ROUTES.RETURNS, badge: "99+", comingSoon: true },
      { label: "Instructions & Claims", icon: IconName.Clipboard, path: ROUTES.CLAIMS, comingSoon: true },
    ],
  },
  {
    title: "Inventory",
    links: [
      { label: "Overview", icon: IconName.Box, path: ROUTES.INVENTORY },
      { label: "Bundles", icon: IconName.Truck, path: ROUTES.BUNDLES, comingSoon: true },
    ],
  },
  {
    title: "Warehouse",
    links: [{ label: "Inbound Deliveries", icon: IconName.Truck, path: ROUTES.INBOUND_DELIVERIES, comingSoon: true }],
  },
  {
    title: "Misc",
    links: [
      { label: "Team Management", icon: IconName.Users, path: ROUTES.TEAM, comingSoon: true },
      { label: "Announcements", icon: IconName.Megaphone, path: ROUTES.ANNOUNCEMENTS, comingSoon: true },
      { label: "Couriers", icon: IconName.Pin, path: ROUTES.COURIERS, comingSoon: true },
      { label: "Activities", icon: IconName.Megaphone, path: ROUTES.ACTIVITIES, comingSoon: true },
    ],
  },
];

export const COMING_SOON_LINKS = NAV_GROUPS.flatMap((group) => group.links).filter((link) => link.comingSoon);
