import {
  LayoutDashboard,
  Building2,
  PackageCheck,
  CalendarDays,
  Boxes,
  Receipt,
  FolderOpen,
  Truck,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Primary navigation. Kept as data (not hard-coded in the sidebar) so it is
 * easy to reorder, gate by role, or extend later.
 */
export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Sponsors", href: "/sponsors", icon: Building2 },
  { title: "Deliverables", href: "/deliverables", icon: PackageCheck },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
  { title: "Packages", href: "/packages", icon: Boxes },
  { title: "Billing", href: "/billing", icon: Receipt },
  { title: "Distribution", href: "/distribution", icon: Truck },
  { title: "Assets", href: "/assets", icon: FolderOpen },
  { title: "Settings", href: "/settings", icon: Settings },
];
