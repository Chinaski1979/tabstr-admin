import { ShieldCheck } from "lucide-react";
import { SidebarNav } from "@/components/layout/SidebarNav";

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold">Tabstr Admin</span>
      </div>
      <SidebarNav />
    </aside>
  );
}
