import { useState } from "react";
import { LogOut, Menu, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/SidebarNav";

export function Header() {
  const { user, role, isFullAccess, signOut } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const email = user?.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();
  const roleLabel = role === "full_access" ? "Full access" : "Standard";

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4 md:h-16 md:px-6">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="flex w-[min(100%,18rem)] flex-col gap-0 bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground"
        >
          <SheetHeader className="space-y-0 border-b border-sidebar-border p-0 text-left">
            <SheetTitle className="flex h-14 items-center gap-2 px-4 text-sidebar-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold">Tabstr Admin</span>
            </SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="min-w-0 truncate text-lg font-semibold md:hidden">Tabstr Admin</div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Badge variant={isFullAccess ? "default" : "secondary"} className="hidden sm:inline-flex">
          {roleLabel}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {initials}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate font-normal">{email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 sm:hidden">
              <Badge variant={isFullAccess ? "default" : "secondary"}>{roleLabel}</Badge>
            </div>
            <DropdownMenuSeparator className="sm:hidden" />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
