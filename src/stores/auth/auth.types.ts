import type { Session, User } from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  session: Session | null;
  /** True until the initial getSession() / auth listener has resolved. */
  initializing: boolean;
}

export interface AuthActions {
  setSession: (session: Session | null) => void;
  setInitializing: (initializing: boolean) => void;
  clear: () => void;
}

export type AuthStore = AuthState & AuthActions;

export const initialAuthState: AuthState = {
  user: null,
  session: null,
  initializing: true,
};
