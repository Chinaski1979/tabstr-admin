import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminUsersService } from "@/services/adminUsers/adminUsersService";
import { queryKeys } from "@/lib/queryKeys";
import { STALE_TIME } from "@/lib/queryCacheConfig";
import type { AdminUser } from "@/types";

/** All admin users — visible to full-access admins only (enforced by RLS). */
export function useAdminUsers() {
  const {
    data: admins = [],
    isPending: isLoading,
    error,
  } = useQuery<AdminUser[]>({
    queryKey: queryKeys.adminUsers(),
    queryFn: () => adminUsersService.getAll(),
    staleTime: STALE_TIME.adminProfile,
  });

  return { admins, isLoading, error };
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (admin: AdminUser) => adminUsersService.delete(admin.id),
    onSuccess: (_void, admin) => {
      toast.success("Administrator removed", { description: admin.email });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers() });
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === "42501") {
        toast.error("Insufficient permissions", {
          description: "Only full-access admins can remove administrators.",
        });
        return;
      }
      toast.error("Could not remove administrator", { description: error.message });
    },
  });

  return { deleteAdminUser: mutation.mutateAsync, isDeleting: mutation.isPending };
}
