import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { revenueService } from "@/services/revenue/revenueService";
import { queryKeys } from "@/lib/queryKeys";
import { STALE_TIME } from "@/lib/queryCacheConfig";
import type { CollectedRevenueInvoice, CreateManualPaymentInput, RevenueOverview } from "@/types";

export function useRevenue() {
  const {
    data: overview = null,
    isPending: isLoading,
    error,
  } = useQuery<RevenueOverview>({
    queryKey: queryKeys.revenue(),
    queryFn: () => revenueService.getOverview(),
    staleTime: STALE_TIME.revenue,
  });

  return { overview, isLoading, error };
}

export function useRevenueInvoices(month: string) {
  const {
    data: invoices = [],
    isPending: isLoading,
    error,
  } = useQuery<CollectedRevenueInvoice[]>({
    queryKey: queryKeys.revenueInvoices(month),
    queryFn: () => revenueService.getInvoicesForMonth(month),
    enabled: !!month,
    staleTime: STALE_TIME.revenue,
  });

  return { invoices, isLoading, error };
}

function invalidatePaymentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  orgRegistryId: string,
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.revenue() });
  queryClient.invalidateQueries({ queryKey: queryKeys.revenueInvoicesRoot() });
  queryClient.invalidateQueries({ queryKey: queryKeys.organizationInvoices(orgRegistryId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.business() });
}

export function useCreateManualPayment() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: CreateManualPaymentInput) => revenueService.createManualPayment(input),
    onSuccess: (invoice) => {
      toast.success("Payment registered", {
        description: invoice.organizationSlug
          ? `${invoice.organizationSlug} · ${invoice.paymentMethod}`
          : undefined,
      });
      if (invoice.organizationRegistryId) {
        invalidatePaymentQueries(queryClient, invoice.organizationRegistryId);
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.revenue() });
        queryClient.invalidateQueries({ queryKey: queryKeys.revenueInvoicesRoot() });
        queryClient.invalidateQueries({ queryKey: queryKeys.business() });
      }
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === "42501") {
        toast.error("Insufficient permissions", {
          description: "Run the latest admin_setup.sql on the registry to allow manual invoices.",
        });
        return;
      }
      toast.error("Could not register payment", { description: error.message });
    },
  });

  return { createManualPayment: mutation.mutateAsync, isCreating: mutation.isPending };
}

export function useDeleteManualPayment() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      invoiceId,
    }: {
      invoiceId: string;
      organizationRegistryId: string;
    }) => revenueService.deleteManualPayment(invoiceId),
    onSuccess: (_void, variables) => {
      toast.success("Payment removed");
      invalidatePaymentQueries(queryClient, variables.organizationRegistryId);
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === "42501") {
        toast.error("Insufficient permissions", {
          description: "Only manually recorded payments can be removed.",
        });
        return;
      }
      toast.error("Could not remove payment", { description: error.message });
    },
  });

  return { deleteManualPayment: mutation.mutateAsync, isDeleting: mutation.isPending };
}
