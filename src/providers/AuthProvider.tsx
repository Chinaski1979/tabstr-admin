import { useEffect } from "react";
import { getRegistryClient } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { queryClient } from "@/lib/queryClient";

/**
 * Bootstraps the Supabase auth session and keeps the auth store in sync.
 * Wrap the app inside QueryClientProvider so query invalidation works here.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const setInitializing = useAuthStore((s) => s.setInitializing);

  useEffect(() => {
    const supabase = getRegistryClient();

    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setInitializing(false));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        // Drop any cached admin/registry data on sign-out.
        queryClient.clear();
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, [setSession, setInitializing]);

  return <>{children}</>;
}
