import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FullPageLoader({ message }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        {message && <p className="text-sm">{message}</p>}
      </div>
    </div>
  );
}

export function LoadingState({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-16 text-muted-foreground", className)}>
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="text-sm font-medium">Could not load data</p>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
