import {
  Building2,
  CreditCard,
  LayoutDashboard,
  LineChart,
  Megaphone,
  ToggleLeft,
  Users,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** When true, only full-access admins see this item. */
  fullAccessOnly?: boolean;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/organizations", label: "Organizations", icon: Building2 },
  { to: "/feature-flags", label: "Feature flags", icon: ToggleLeft },
  { to: "/platform-messages", label: "Platform messages", icon: Megaphone },
  { to: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/revenue", label: "Revenue", icon: LineChart, fullAccessOnly: true },
  { to: "/admins", label: "Administrators", icon: Users, fullAccessOnly: true },
];
