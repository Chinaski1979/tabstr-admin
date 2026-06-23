import { LogOut } from "lucide-react";
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

export function Header() {
  const { user, role, isFullAccess, signOut } = useAuth();
  const email = user?.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="md:hidden text-lg font-semibold">Tabstr Admin</div>
      <div className="ml-auto flex items-center gap-3">
        <Badge variant={isFullAccess ? "default" : "secondary"}>
          {role === "full_access" ? "Full access" : "Standard"}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {initials}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate font-normal">{email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
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
