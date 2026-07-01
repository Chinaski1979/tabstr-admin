import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { subscriptionsService } from "@/services/subscriptions/subscriptionsService";
import { queryKeys } from "@/lib/queryKeys";
import { STALE_TIME } from "@/lib/queryCacheConfig";
import type {
  CreateSubscriptionPlanInput,
  OrganizationSpecialPlan,
  Subscription,
  SubscriptionInvoice,
  SubscriptionPlan,
  UpdateSubscriptionPlanInput,
} from "@/types";

export function useSubscriptionPlans() {
  const {
    data: plans = [],
    isPending: isLoading,
    error,
  } = useQuery<SubscriptionPlan[]>({
    queryKey: queryKeys.subscriptionPlans(),
    queryFn: () => subscriptionsService.getPlans(),
    staleTime: STALE_TIME.subscriptionPlans,
  });

  return { plans, isLoading, error };
}

export function useCreateSubscriptionPlan() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: CreateSubscriptionPlanInput) => subscriptionsService.create(input),
    onSuccess: (plan) => {
      toast.success("Subscription plan created", { description: plan.planName });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptionPlans() });
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === "23505") {
        toast.error("Plan name already exists", {
          description: "Choose a different plan_name value.",
        });
        return;
      }
      if (error.code === "42501") {
        toast.error("Insufficient permissions", {
          description: "Run the latest admin_setup.sql INSERT policies on the registry.",
        });
        return;
      }
      toast.error("Could not create subscription plan", { description: error.message });
    },
  });

  return { createSubscriptionPlan: mutation.mutateAsync, isCreating: mutation.isPending };
}

export function useUpdateSubscriptionPlan() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ planId, input }: { planId: string; input: UpdateSubscriptionPlanInput }) =>
      subscriptionsService.update(planId, input),
    onSuccess: (plan) => {
      toast.success("Subscription plan updated", { description: plan.planName });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptionPlans() });
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === "23505") {
        toast.error("Plan name already exists", {
          description: "Choose a different plan_name value.",
        });
        return;
      }
      toast.error("Could not update subscription plan", { description: error.message });
    },
  });

  return { updateSubscriptionPlan: mutation.mutateAsync, isUpdating: mutation.isPending };
}

export function useDeleteSubscriptionPlan() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (planId: string) => subscriptionsService.delete(planId),
    onSuccess: () => {
      toast.success("Subscription plan deleted");
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptionPlans() });
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === "23503") {
        toast.error("Cannot delete plan", {
          description: "Organizations are still subscribed to this plan.",
        });
        return;
      }
      toast.error("Could not delete subscription plan", { description: error.message });
    },
  });

  return { deleteSubscriptionPlan: mutation.mutateAsync, isDeleting: mutation.isPending };
}

export function useAllSubscriptions() {
  const {
    data: subscriptions = [],
    isPending: isLoading,
    error,
  } = useQuery<(Subscription & { organizationSlug: string })[]>({
    queryKey: ["allSubscriptions"],
    queryFn: () => subscriptionsService.getAllWithOrg(),
    staleTime: STALE_TIME.subscriptions,
  });

  return { subscriptions, isLoading, error };
}

export function useOrganizationSubscription(orgRegistryId: string) {
  const {
    data: subscription = null,
    isPending: isLoading,
    error,
  } = useQuery<Subscription | null>({
    queryKey: queryKeys.organizationSubscription(orgRegistryId),
    queryFn: () => subscriptionsService.getCurrentForOrg(orgRegistryId),
    enabled: !!orgRegistryId,
    staleTime: STALE_TIME.subscriptions,
  });

  return { subscription, isLoading, error };
}

export function useOrganizationInvoices(orgRegistryId: string) {
  const {
    data: invoices = [],
    isPending: isLoading,
    error,
  } = useQuery<SubscriptionInvoice[]>({
    queryKey: queryKeys.organizationInvoices(orgRegistryId),
    queryFn: () => subscriptionsService.getInvoicesForOrg(orgRegistryId),
    enabled: !!orgRegistryId,
    staleTime: STALE_TIME.invoices,
  });

  return { invoices, isLoading, error };
}

export function useOrganizationSpecialPlan(orgRegistryId: string) {
  const {
    data: specialPlan = null,
    isPending: isLoading,
    error,
  } = useQuery<OrganizationSpecialPlan | null>({
    queryKey: queryKeys.organizationSpecialPlan(orgRegistryId),
    queryFn: () => subscriptionsService.getSpecialPlanForOrg(orgRegistryId),
    enabled: !!orgRegistryId,
    staleTime: STALE_TIME.subscriptions,
  });

  return { specialPlan, isLoading, error };
}
