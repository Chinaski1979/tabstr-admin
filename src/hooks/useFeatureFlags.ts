import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { featureFlagsService } from "@/services/featureFlags/featureFlagsService";
import { queryKeys } from "@/lib/queryKeys";
import { STALE_TIME } from "@/lib/queryCacheConfig";
import type { FeatureFlag, OrganizationFeature, CreateFeatureFlagInput, UpdateFeatureFlagInput } from "@/types";

export function useFeatureFlags() {
  const {
    data: flags = [],
    isPending: isLoading,
    error,
  } = useQuery<FeatureFlag[]>({
    queryKey: queryKeys.featureFlags(),
    queryFn: () => featureFlagsService.getAll(),
    staleTime: STALE_TIME.featureFlags,
  });

  return { flags, isLoading, error };
}

export function useSetGlobalFeatureFlag() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ flagId, isEnabled }: { flagId: string; isEnabled: boolean }) =>
      featureFlagsService.setGlobalEnabled(flagId, isEnabled),
    onSuccess: (flag) => {
      toast.success(
        flag.isEnabled ? "Feature enabled globally" : "Feature disabled globally",
        { description: flag.featureName },
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlags() });
      // Per-org effective state depends on the global switch.
      queryClient.invalidateQueries({ queryKey: ["organizationFeatures"] });
    },
    onError: (error: Error) => {
      toast.error("Could not update feature flag", { description: error.message });
    },
  });

  return { setGlobalEnabled: mutation.mutate, isUpdating: mutation.isPending };
}

export function useCreateFeatureFlag() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: CreateFeatureFlagInput) => featureFlagsService.create(input),
    onSuccess: (flag) => {
      toast.success("Feature flag created", { description: flag.featureName });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlags() });
      queryClient.invalidateQueries({ queryKey: ["organizationFeatures"] });
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === "23505") {
        toast.error("Feature name already exists", {
          description: "Choose a different feature_name value.",
        });
        return;
      }
      toast.error("Could not create feature flag", { description: error.message });
    },
  });

  return { createFeatureFlag: mutation.mutateAsync, isCreating: mutation.isPending };
}

export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ flagId, input }: { flagId: string; input: UpdateFeatureFlagInput }) =>
      featureFlagsService.update(flagId, input),
    onSuccess: (flag) => {
      toast.success("Feature flag updated", { description: flag.featureName });
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlags() });
      queryClient.invalidateQueries({ queryKey: ["organizationFeatures"] });
    },
    onError: (error: Error) => {
      toast.error("Could not update feature flag", { description: error.message });
    },
  });

  return { updateFeatureFlag: mutation.mutateAsync, isUpdating: mutation.isPending };
}

export function useOrganizationFeatures(orgRegistryId: string) {
  const {
    data: features = [],
    isPending: isLoading,
    error,
  } = useQuery<OrganizationFeature[]>({
    queryKey: queryKeys.organizationFeatures(orgRegistryId),
    queryFn: () => featureFlagsService.getForOrganization(orgRegistryId),
    enabled: !!orgRegistryId,
    staleTime: STALE_TIME.organizationFeatures,
  });

  return { features, isLoading, error };
}

export function useSetOrganizationFeature(orgRegistryId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ flagId, active }: { flagId: string; active: boolean }) =>
      featureFlagsService.setOrganizationFeatureActive(orgRegistryId, flagId, active),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationFeatures(orgRegistryId),
      });
    },
    onError: (error: Error) => {
      toast.error("Could not update organization feature", { description: error.message });
    },
  });

  return { setOrganizationFeature: mutation.mutate, isUpdating: mutation.isPending };
}
