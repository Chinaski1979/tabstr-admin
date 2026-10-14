import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeleteOrganizationDialog } from "./DeleteOrganizationDialog";
import { useAuth } from "@/hooks/useAuth";
import { useOrgDeleteCapability } from "@/hooks/useOrgDelete";
import { cn } from "@/lib/utils";
import type { OrganizationRegistry } from "@/types";

interface DeleteOrganizationButtonProps {
  organization: OrganizationRegistry;
  size?: "sm" | "default";
  className?: string;
}

/**
 * Destructive trigger for the recursive delete flow (renders its own dialog).
 * Hidden behind the `full_access` admin tier and disabled (with the reason as
 * tooltip) when the org is not on a shared project or its service key is missing.
 */
export function DeleteOrganizationButton({
  organization,
  size = "sm",
  className,
}: DeleteOrganizationButtonProps) {
  const [open, setOpen] = useState(false);

  const { isFullAccess } = useAuth();
  const { capability, isLoading } = useOrgDeleteCapability(organization);
  const reason = !isFullAccess
    ? "Only full-access admins can delete organizations."
    : isLoading
      ? "Checking deletion capability…"
      : capability.reason;

  return (
    <>
      <span className={cn("inline-flex", className)} title={reason}>
        <Button
          variant="destructive"
          size={size}
          disabled={!isFullAccess || isLoading || !capability.enabled}
          aria-label={`Delete organization ${organization.organizationSlug}`}
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </span>
      <DeleteOrganizationDialog
        organization={organization}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
