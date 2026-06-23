import { useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { authService } from "@/services/auth/authService";
import type { AdminRole } from "@/types";

/**
 * Combines Supabase auth session (Zustand) with the admin profile (Query).
 * `isAdmin` requires an active admin_users row; `isFullAccess` is the higher tier.
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const initializing = useAuthStore((s) => s.initializing);
  const { profile, isLoading: profileLoading } = useAdminProfile();

  const isAuthenticated = !!session && !!user;
  const isActiveAdmin = !!profile && profile.isActive;
  const isFullAccess = isActiveAdmin && profile?.role === "full_access";

  const hasRole = useCallback(
    (role: AdminRole) => {
      if (!isActiveAdmin) return false;
      if (role === "standard") return true; // full_access satisfies standard too
      return profile?.role === role;
    },
    [isActiveAdmin, profile?.role],
  );

  const signIn = useCallback(
    (email: string, password: string) => authService.signInWithPassword(email, password),
    [],
  );

  const signOut = useCallback(() => authService.signOut(), []);

  return {
    user,
    session,
    profile,
    isAuthenticated,
    isActiveAdmin,
    isFullAccess,
    role: profile?.role ?? null,
    hasRole,
    // While authenticated, we are still "loading" until the profile resolves.
    loading: initializing || (isAuthenticated && profileLoading),
    signIn,
    signOut,
  };
}
