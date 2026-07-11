import { NavLink } from "react-router";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { NAV_ITEMS } from "@/components/layout/navItems";

interface SidebarNavProps {
  /** Extra classes for each link (e.g. mobile sheet styling). */
  linkClassName?: string;
  /** Called after a nav link is activated (used to close the mobile sheet). */
  onNavigate?: () => void;
}

export function SidebarNav({ linkClassName, onNavigate }: SidebarNavProps) {
  const { isFullAccess } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.fullAccessOnly || isFullAccess);

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              linkClassName,
            )
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
