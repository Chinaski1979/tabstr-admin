import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { FullPageLoader } from "@/components/common/StateViews";
import { AccessDenied } from "@/components/auth/AccessDenied";
import type { AdminRole } from "@/types";

interface ProtectedRouteProps {
  /** When set, the active admin must satisfy this role to view the route. */
  requiredRole?: AdminRole;
}

/**
 * Guards routes that require an authenticated, active admin. Optionally enforces
 * a minimum role (e.g. `full_access` for revenue views).
 */
export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { loading, isAuthenticated, isActiveAdmin, hasRole } = useAuth();

  if (loading) return <FullPageLoader message="Loading…" />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Authenticated against Supabase but not an active admin in admin_users.
  if (!isActiveAdmin) return <AccessDenied reason="not-admin" />;

  if (requiredRole && !hasRole(requiredRole)) {
    return <AccessDenied reason="insufficient-role" />;
  }

  return <Outlet />;
}
