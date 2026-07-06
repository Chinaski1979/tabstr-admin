import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { findSharedProjectByUrl } from '@/config/sharedSupabaseProjects';
import { queryKeys } from '@/lib/queryKeys';
import { STALE_TIME } from '@/lib/queryCacheConfig';
import { orgUsersService } from '@/services/orgUsers/orgUsersService';
import type { CreateOrgUserInput, OrganizationMember, OrganizationRegistry, UpdateOrgUserInput } from '@/types';

export function isSharedProjectOrganization(organization: OrganizationRegistry): boolean {
  return findSharedProjectByUrl(organization.supabaseUrl) !== undefined;
}

export function useOrganizationMembers(organization: OrganizationRegistry) {
  const enabled = isSharedProjectOrganization(organization);

  const {
    data: members = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.organizationMembers(organization.id),
    queryFn: () => orgUsersService.listMembers(organization),
    enabled,
    staleTime: STALE_TIME.organizationMembers,
  });

  return { members, isLoading, error, isSharedProject: enabled };
}

export function useCreateOrgUser(organization: OrganizationRegistry) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: CreateOrgUserInput) => orgUsersService.createUser(organization, input),
    onSuccess: (result) => {
      toast.success('User added', {
        description: result.reusedExistingUser
          ? 'Existing user was linked to this organization'
          : 'New user created and added to this organization',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizationMembers(organization.id) });
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === '23505') {
        toast.error('User already belongs to this organization');
        return;
      }
      if (error.message.includes('not on a configured shared project')) {
        toast.error('Unsupported organization', { description: error.message });
        return;
      }
      if (error.message.includes('not found in tenant database')) {
        toast.error('Organization not found', { description: error.message });
        return;
      }
      toast.error('Could not create user', { description: error.message });
    },
  });

  return {
    createOrgUser: mutation.mutateAsync,
    isCreating: mutation.isPending,
  };
}

export function useUpdateOrgUser(organization: OrganizationRegistry) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      member,
      input,
    }: {
      member: OrganizationMember;
      input: UpdateOrgUserInput;
    }) => orgUsersService.updateMember(organization, member, input),
    onSuccess: () => {
      toast.success('Member updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.organizationMembers(organization.id) });
    },
    onError: (error: Error & { code?: string }) => {
      toast.error('Could not update member', { description: error.message });
    },
  });

  return {
    updateOrgUser: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
