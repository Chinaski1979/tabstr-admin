import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const noopStorage = {
  getItem: (_key: string) => null,
  setItem: (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
};

/**
 * Validates that a Supabase key is the service_role JWT (not anon).
 */
export function assertServiceRoleKey(serviceKey: string): void {
  try {
    const payload = JSON.parse(atob(serviceKey.split('.')[1] ?? '')) as { role?: string };
    if (payload.role !== 'service_role') {
      throw new Error(
        'Invalid Supabase service role key. Use the service_role secret from Project Settings → API, not the anon key.',
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('service role')) {
      throw error;
    }
    const err = new Error('Invalid Supabase service role key format.');
    (err as Error & { cause: unknown }).cause = error;
    throw err;
  }
}

/**
 * Org DB client for provisioning — isolated from browser auth sessions so
 * PostgREST always uses service_role (bypasses RLS).
 */
export function createOrgAdminClient(supabaseUrl: string, serviceRoleKey: string): SupabaseClient {
  assertServiceRoleKey(serviceRoleKey);

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: noopStorage,
    },
  });
}
