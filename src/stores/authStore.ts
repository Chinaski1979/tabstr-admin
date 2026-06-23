import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { initialAuthState, type AuthStore } from "@/stores/auth/auth.types";

/**
 * Client/session auth state only (Supabase user + session). The admin role and
 * profile are SERVER state, fetched via TanStack Query in `useAdminProfile` —
 * never duplicated here. See the tabstr-admin state-boundaries skill.
 */
export const useAuthStore = create<AuthStore>()(
  devtools(
    (set) => ({
      ...initialAuthState,
      setSession: (session) => set({ session, user: session?.user ?? null }),
      setInitializing: (initializing) => set({ initializing }),
      clear: () => set({ user: null, session: null }),
    }),
    { name: "auth-store" },
  ),
);
