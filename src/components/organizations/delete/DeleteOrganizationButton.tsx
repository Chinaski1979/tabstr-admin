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
 * Hidden behind the `full_access` admin tier.
 * - For standard admins: always disabled.
 * - For full-access admins:
 *   - Enabled when capability.enabled (full recursive delete on shared project)
 *   - Enabled when capability.disabled with reason "not on a configured shared project" (registry-only delete)
 *   - Disabled when capability.disabled for other reasons (e.g., missing service key)
 */
export function DeleteOrganizationButton({
  organization,
  size = "sm",
  className,
}: DeleteOrganizationButtonProps) {
  const [open, setOpen] = useState(false);

  const { isFullAccess } = useAuth();
  const { capability, isLoading } = useOrgDeleteCapability(organization);

  const isRegistryOnlyCase =
    isFullAccess &&
    !capability.enabled &&
    capability.disabledReason === "not-on-shared-project";

  const isEnabled = isFullAccess && !isLoading && (capability.enabled || isRegistryOnlyCase);

  const reason = !isFullAccess
    ? "Only full-access admins can delete organizations."
    : isLoading
      ? "Checking deletion capability…"
      : capability.enabled
        ? "Full recursive delete available"
        : isRegistryOnlyCase
          ? "Registry-only delete available (not on shared project)"
          : capability.reason;

  return (
    <>
      <span className={cn("inline-flex", className)} title={reason}>
        <Button
          variant="destructive"
          size={size}
          disabled={!isEnabled}
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
