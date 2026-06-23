import { useQuery } from "@tanstack/react-query";
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
