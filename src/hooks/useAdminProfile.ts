import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { adminUsersService } from "@/services/adminUsers/adminUsersService";
import { queryKeys } from "@/lib/queryKeys";
import { STALE_TIME } from "@/lib/queryCacheConfig";
import type { AdminUser } from "@/types";

/**
 * The current admin's profile (role + active flag), loaded from admin_users.
 * Server state — the source of truth for what the signed-in user can do.
 */
export function useAdminProfile() {
  const userId = useAuthStore((s) => s.user?.id ?? "");

  const {
    data: profile = null,
    isPending: isLoading,
    error,
  } = useQuery<AdminUser | null>({
    queryKey: queryKeys.adminProfile(userId),
    queryFn: () => adminUsersService.getByUserId(userId),
    enabled: !!userId,
    staleTime: STALE_TIME.adminProfile,
  });

  return { profile, isLoading, error };
}
