import { NavLink } from "react-router";
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  LineChart,
  Megaphone,
  ShieldCheck,
  ToggleLeft,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** When true, only full-access admins see this item. */
  fullAccessOnly?: boolean;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/organizations", label: "Organizations", icon: Building2 },
  { to: "/feature-flags", label: "Feature flags", icon: ToggleLeft },
  { to: "/platform-messages", label: "Platform messages", icon: Megaphone },
  { to: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/revenue", label: "Revenue", icon: LineChart, fullAccessOnly: true },
  { to: "/admins", label: "Administrators", icon: Users, fullAccessOnly: true },
];

export function Sidebar() {
  const { isFullAccess } = useAuth();

  const items = NAV_ITEMS.filter((item) => !item.fullAccessOnly || isFullAccess);

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold">Tabstr Admin</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
