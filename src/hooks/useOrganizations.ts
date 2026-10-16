import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { organizationsService } from "@/services/organizations/organizationsService";
import { queryKeys } from "@/lib/queryKeys";
import { STALE_TIME } from "@/lib/queryCacheConfig";
import type { OrganizationRegistry } from "@/types";

export function useOrganizations() {
  const {
    data: organizations = [],
    isPending: isLoading,
    isFetching,
    error,
  } = useQuery<OrganizationRegistry[]>({
    queryKey: queryKeys.organizations(),
    queryFn: () => organizationsService.getAll(),
    staleTime: STALE_TIME.organizations,
  });

  return { organizations, isLoading, isFetching, error };
}

export function useOrganization(id: string) {
  const {
    data: organization = null,
    isPending: isLoading,
    error,
  } = useQuery<OrganizationRegistry | null>({
    queryKey: queryKeys.organization(id),
    queryFn: () => organizationsService.getById(id),
    enabled: !!id,
    staleTime: STALE_TIME.organizations,
  });

  return { organization, isLoading, error };
}

function invalidateOrganization(queryClient: ReturnType<typeof useQueryClient>, org: OrganizationRegistry) {
  queryClient.invalidateQueries({ queryKey: queryKeys.organizations() });
  queryClient.invalidateQueries({ queryKey: queryKeys.organization(org.id) });
}

export function useSetOrganizationActive() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      organizationsService.setActive(id, isActive),
    onSuccess: (org) => {
      toast.success(org.isActive ? "Organization activated" : "Organization deactivated", {
        description: org.organizationSlug,
      });
      invalidateOrganization(queryClient, org);
    },
    onError: (error: Error) => {
      toast.error("Could not update organization", { description: error.message });
    },
  });

  return { setActive: mutation.mutate, isUpdating: mutation.isPending };
}

export function useSetOrganizationSuspended() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, isSuspended }: { id: string; isSuspended: boolean }) =>
      organizationsService.setSuspended(id, isSuspended),
    onSuccess: (org) => {
      toast.success(org.isSuspended ? "Organization suspended" : "Organization unsuspended", {
        description: org.organizationSlug,
      });
      invalidateOrganization(queryClient, org);
    },
    onError: (error: Error) => {
      toast.error("Could not update organization", { description: error.message });
    },
  });

  return { setSuspended: mutation.mutate, isUpdating: mutation.isPending };
}
