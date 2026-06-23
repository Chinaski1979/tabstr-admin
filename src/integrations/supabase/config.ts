/**
 * Registry Supabase configuration.
 *
 * The admin console connects ONLY to the central registry project (the same one
 * tabstr uses as VITE_REGISTRY_SUPABASE_URL). It does not connect to per-org
 * tenant databases.
 */
export interface RegistryConfig {
  url: string;
  anonKey: string;
}

export const getRegistryConfig = (): RegistryConfig => {
  const url = import.meta.env.VITE_REGISTRY_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_REGISTRY_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Registry credentials are required: set VITE_REGISTRY_SUPABASE_URL and VITE_REGISTRY_SUPABASE_ANON_KEY in your .env.local",
    );
  }

  return { url, anonKey };
};
