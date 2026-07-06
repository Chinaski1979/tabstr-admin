import type { SupabaseClient } from '@supabase/supabase-js';
import { createOrgAdminClient } from './orgAdminClient';

/** Looks up a profile id by email (stored as username) in the org DB. */
export async function findOrgUserIdByEmail(
  orgClient: SupabaseClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await orgClient
    .from('profiles')
    .select('id')
    .eq('username', email)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to check existing user: ${error.message}`);
  }

  return data?.id ?? null;
}

/** Returns true if a profile with this email already exists in the org DB. */
export async function checkOrgUserExistsByEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  email: string,
): Promise<boolean> {
  const orgClient = createOrgAdminClient(supabaseUrl, serviceRoleKey);
  const userId = await findOrgUserIdByEmail(orgClient, email);
  return userId !== null;
}
