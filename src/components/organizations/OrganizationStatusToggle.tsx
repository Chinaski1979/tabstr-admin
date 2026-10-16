import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  useSetOrganizationActive,
  useSetOrganizationSuspended,
} from "@/hooks/useOrganizations";
import type { OrganizationRegistry } from "@/types";

/**
 * Activate/deactivate an organization, plus a soft Suspend toggle.
 * Deactivate makes the org unavailable to the POS (is_active). Suspend keeps
 * login working; the POS can read is_suspended to gate features.
 */
export function OrganizationStatusToggle({ organization }: { organization: OrganizationRegistry }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { setActive, isUpdating: isUpdatingActive } = useSetOrganizationActive();
  const { setSuspended, isUpdating: isUpdatingSuspended } = useSetOrganizationSuspended();
  const isUpdating = isUpdatingActive || isUpdatingSuspended;

  return (
    <div className="inline-flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Switch
          id={`suspend-${organization.id}`}
          checked={organization.isSuspended}
          disabled={isUpdating}
          onCheckedChange={(checked) =>
            setSuspended({ id: organization.id, isSuspended: checked })
          }
          className="data-[state=checked]:bg-amber-500"
        />
        <Label
          htmlFor={`suspend-${organization.id}`}
          className="cursor-pointer text-xs font-normal text-muted-foreground"
        >
          Suspend
        </Label>
      </div>

      {organization.isActive ? (
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
                  it at any time. Prefer Suspend if you only need to restrict features while keeping
                  login available.
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
      ) : (
        <Button
          variant="success"
          size="sm"
          disabled={isUpdating}
          onClick={() => setActive({ id: organization.id, isActive: true })}
        >
          Activate
        </Button>
      )}
    </div>
  );
}
