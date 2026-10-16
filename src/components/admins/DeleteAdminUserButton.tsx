import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { useDeleteAdminUser } from "@/hooks/useAdminUsers";
import type { AdminUser } from "@/types";

interface DeleteAdminUserButtonProps {
  admin: AdminUser;
  isCurrentUser: boolean;
}

export function DeleteAdminUserButton({ admin, isCurrentUser }: DeleteAdminUserButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { deleteAdminUser, isDeleting } = useDeleteAdminUser();

  if (isCurrentUser) {
    return (
      <span title="You cannot remove your own admin access">
        <Button variant="outline" size="sm" disabled aria-label="Cannot delete your own account">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </span>
    );
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        disabled={isDeleting}
        aria-label={`Delete administrator ${admin.email}`}
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {admin.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes their row from admin_users. They will no longer be able to use the admin
              console. Their Auth account is not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() => {
                void deleteAdminUser(admin);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
