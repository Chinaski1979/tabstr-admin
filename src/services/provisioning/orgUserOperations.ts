import type { SupabaseClient } from '@supabase/supabase-js';
import type { OrgMembershipRole } from '@/types';

export interface CreateOrgAuthUserInput {
  email: string;
  password: string;
  fullName: string;
}

export interface InsertOrgMembershipInput {
  userId: string;
  organizationId: string;
  role: OrgMembershipRole;
}

/** Creates a new auth user with email auto-confirmed (service_role admin API). */
export async function createOrgAuthUser(
  orgClient: SupabaseClient,
  input: CreateOrgAuthUserInput,
): Promise<string> {
  const { data, error } = await orgClient.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
    },
  });

  if (error) {
    throw new Error(`Failed to create auth user: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('User creation returned no user data');
  }

  return data.user.id;
}

/** Creates an organization membership for the user. */
export async function insertOrgMembership(
  orgClient: SupabaseClient,
  input: InsertOrgMembershipInput,
): Promise<void> {
  const { error } = await orgClient.from('organization_memberships').insert({
    user_id: input.userId,
    organization_id: input.organizationId,
    role: input.role,
    is_active: true,
    joined_at: new Date().toISOString(),
  });

  if (error) {
    const err = new Error(`Failed to create membership: ${error.message}`) as Error & {
      code?: string;
    };
    err.code = error.code;
    throw err;
  }
}
