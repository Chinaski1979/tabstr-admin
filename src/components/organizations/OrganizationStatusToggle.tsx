import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  useSetOrganizationTest,
} from "@/hooks/useOrganizations";
import type { OrganizationRegistry } from "@/types";

interface OrganizationStatusToggleProps {
  organization: OrganizationRegistry;
}

/**
 * Single actions menu for an organization: suspend, activate/deactivate, and
 * mark as test. Deactivate makes the org unavailable to the POS (is_active).
 * Suspend keeps login working; the POS can read is_suspended to gate features.
 * Marking as test only moves the org between the Real and Test lists.
 */
export function OrganizationStatusToggle({ organization }: OrganizationStatusToggleProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { setActive, isUpdating: isUpdatingActive } = useSetOrganizationActive();
  const { setSuspended, isUpdating: isUpdatingSuspended } = useSetOrganizationSuspended();
  const { setTest, isUpdating: isUpdatingTest } = useSetOrganizationTest();
  const isUpdating = isUpdatingActive || isUpdatingSuspended || isUpdatingTest;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isUpdating} aria-label="Actions">
            Actions
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={isUpdating}
            onClick={() =>
              setSuspended({ id: organization.id, isSuspended: !organization.isSuspended })
            }
          >
            {organization.isSuspended ? "Unsuspend" : "Suspend"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isUpdating}
            onClick={() => {
              if (organization.isActive) {
                setConfirmOpen(true);
                return;
              }
              setActive({ id: organization.id, isActive: true });
            }}
          >
            {organization.isActive ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isUpdating}
            onClick={() => setTest({ id: organization.id, isTest: !organization.isTest })}
          >
            {organization.isTest ? "Move to organizations" : "Mark as test"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
  );
}
