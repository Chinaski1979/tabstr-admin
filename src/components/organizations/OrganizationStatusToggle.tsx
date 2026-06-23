import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSetOrganizationActive } from "@/hooks/useOrganizations";
import type { OrganizationRegistry } from "@/types";

/**
 * Activate/deactivate an organization. Deactivating asks for confirmation since
 * it makes the org unavailable to the POS (registry lookups filter on is_active).
 */
export function OrganizationStatusToggle({ organization }: { organization: OrganizationRegistry }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { setActive, isUpdating } = useSetOrganizationActive();

  if (organization.isActive) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          disabled={isUpdating}
          onClick={() => setConfirmOpen(true)}
        >
          Deactivate
        </Button>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate {organization.organizationSlug}?</AlertDialogTitle>
              <AlertDialogDescription>
                The POS will no longer be able to connect to this organization. You can reactivate
                it at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => setActive({ id: organization.id, isActive: false })}
              >
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <Button
      variant="success"
      size="sm"
      disabled={isUpdating}
      onClick={() => setActive({ id: organization.id, isActive: true })}
    >
      Activate
    </Button>
  );
}
