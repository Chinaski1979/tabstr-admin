import { useQuery } from "@tanstack/react-query";
import { subscriptionsService } from "@/services/subscriptions/subscriptionsService";
import { queryKeys } from "@/lib/queryKeys";
import { STALE_TIME } from "@/lib/queryCacheConfig";
import type {
  OrganizationSpecialPlan,
  Subscription,
  SubscriptionInvoice,
  SubscriptionPlan,
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
