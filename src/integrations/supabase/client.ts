import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRegistryConfig } from "@/integrations/supabase/config";

/**
 * Single registry client for the whole admin console.
 *
 * Auth (email + password) is handled against the registry project directly.
 * All reads/writes go through RLS policies scoped to admin users — the anon key
 * is the only key this client app ever holds (never the service role).
 */
let client: SupabaseClient | null = null;

export const getRegistryClient = (): SupabaseClient => {
  if (!client) {
    const config = getRegistryConfig();
    client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "tabstr-admin-auth",
      },
    });
  }
  return client;
};
