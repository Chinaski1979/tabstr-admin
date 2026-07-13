import type { SupabaseClient } from '@supabase/supabase-js';

import { resolveOrgServiceKey } from '@/config/sharedSupabaseProjects';
import { findOrgUserIdByEmail } from '@/services/provisioning/checkOrgUser';
import { createOrgAdminClient } from '@/services/provisioning/orgAdminClient';
import { createOrgAuthUser, insertOrgMembership } from '@/services/provisioning/orgUserOperations';
import type {
  CreateOrgUserInput,
  CreateOrgUserResult,
  OrganizationMember,
  OrganizationRegistry,
  UpdateOrgUserInput,
} from '@/types';

interface ProfileRow {
  id: string;
  username: string;
  full_name: string;
}

interface MembershipRow {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  joined_at: string;
}

function mapMember(membership: MembershipRow, profile: ProfileRow | undefined): OrganizationMember {
  return {
    id: membership.id,
    userId: membership.user_id,
    email: profile?.username ?? '',
    fullName: profile?.full_name ?? '',
    role: membership.role as OrganizationMember['role'],
    isActive: membership.is_active,
    joinedAt: new Date(membership.joined_at),
  };
}

async function getOrgDbClient(organization: OrganizationRegistry) {
  const serviceKey = resolveOrgServiceKey(organization.supabaseUrl);
  return createOrgAdminClient(organization.supabaseUrl, serviceKey);
}

async function resolveTenantOrganizationId(
  orgClient: SupabaseClient,
  organizationSlug: string,
): Promise<string> {
  const { data, error } = await orgClient
    .from('organizations')
    .select('id')
    .eq('slug', organizationSlug)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to look up organization: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error('Organization not found in tenant database');
  }

  return data.id;
}

export const orgUsersService = {
  async listMembers(organization: OrganizationRegistry): Promise<OrganizationMember[]> {
    const orgClient = await getOrgDbClient(organization);
    const organizationId = await resolveTenantOrganizationId(
      orgClient,
      organization.organizationSlug,
    );

    const { data: memberships, error } = await orgClient
      .from('organization_memberships')
      .select('id, user_id, role, is_active, joined_at')
      .eq('organization_id', organizationId)
      .order('joined_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list members: ${error.message}`);
    }

    const rows = (memberships ?? []) as MembershipRow[];
    if (rows.length === 0) return [];

    const userIds = rows.map((row) => row.user_id);
    const { data: profiles, error: profilesError } = await orgClient
      .from('profiles')
      .select('id, username, full_name')
      .in('id', userIds);

    if (profilesError) {
      throw new Error(`Failed to load member profiles: ${profilesError.message}`);
    }

    const profileById = new Map(
      ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
    );

    return rows.map((row) => mapMember(row, profileById.get(row.user_id)));
  },

  async createUser(
    organization: OrganizationRegistry,
    input: CreateOrgUserInput,
  ): Promise<CreateOrgUserResult> {
    const orgClient = await getOrgDbClient(organization);
    const organizationId = await resolveTenantOrganizationId(
      orgClient,
      organization.organizationSlug,
    );

    let userId = await findOrgUserIdByEmail(orgClient, input.email);
    const reusedExistingUser = userId !== null;

    if (!userId) {
      userId = await createOrgAuthUser(orgClient, {
        email: input.email,
        password: input.password,
        fullName: input.fullName,
      });
    }

    await insertOrgMembership(orgClient, {
      userId,
      organizationId,
      role: input.role,
    });

    const { data: membership, error } = await orgClient
      .from('organization_memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch created membership: ${error.message}`);
    }

    return {
      userId,
      membershipId: membership.id,
      reusedExistingUser,
    };
  },

  async updateMember(
    organization: OrganizationRegistry,
    member: OrganizationMember,
    input: UpdateOrgUserInput,
  ): Promise<void> {
    const orgClient = await getOrgDbClient(organization);

    const { error: profileError } = await orgClient
      .from('profiles')
      .update({
        full_name: input.fullName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', member.userId);

    if (profileError) {
      throw new Error(`Failed to update profile: ${profileError.message}`);
    }

    const { error: authError } = await orgClient.auth.admin.updateUserById(member.userId, {
      user_metadata: { full_name: input.fullName },
    });

    if (authError) {
      throw new Error(`Failed to update auth user: ${authError.message}`);
    }

    const { error: membershipError } = await orgClient
      .from('organization_memberships')
      .update({
        role: input.role,
        is_active: input.isActive,
      })
      .eq('id', member.id);

    if (membershipError) {
      const err = new Error(`Failed to update membership: ${membershipError.message}`) as Error & {
        code?: string;
      };
      err.code = membershipError.code;
      throw err;
    }
  },
};
