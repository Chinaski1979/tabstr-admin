import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const COPY = {
  "not-admin": {
    title: "Not an administrator",
    description:
      "Your account is signed in but is not registered as a Tabstr administrator. Ask a full-access admin to add you to admin_users.",
  },
  "insufficient-role": {
    title: "Full access required",
    description: "This section is only available to full-access administrators.",
  },
} as const;

export function AccessDenied({ reason }: { reason: keyof typeof COPY }) {
  const { signOut } = useAuth();
  const copy = COPY[reason];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <ShieldAlert className="h-10 w-10 text-destructive" />
      <div>
        <h1 className="text-xl font-semibold">{copy.title}</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{copy.description}</p>
      </div>
      <Button variant="outline" onClick={() => signOut()}>
        Sign out
      </Button>
    </div>
  );
}
