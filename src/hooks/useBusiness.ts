import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { businessService } from "@/services/business/businessService";
import { formatMonthLabel } from "@/lib/revenue";
import { queryKeys } from "@/lib/queryKeys";
import { STALE_TIME } from "@/lib/queryCacheConfig";
import type { BusinessScorecard, CloseBusinessMonthInput } from "@/types";

export function useBusiness() {
  const {
    data: scorecard = null,
    isPending: isLoading,
    error,
  } = useQuery<BusinessScorecard>({
    queryKey: queryKeys.business(),
    queryFn: () => businessService.getScorecard(),
    staleTime: STALE_TIME.business,
  });

  return { scorecard, isLoading, error };
}

export function useCloseBusinessMonth() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: CloseBusinessMonthInput) => businessService.closeMonth(input),
    onSuccess: (_void, input) => {
      toast.success("Month closed", { description: formatMonthLabel(input.month) });
      queryClient.invalidateQueries({ queryKey: queryKeys.business() });
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === "42501") {
        toast.error("Insufficient permissions", {
          description:
            "Run the latest admin_setup.sql on the registry so full-access admins can close a month.",
        });
        return;
      }
      toast.error("Could not close month", { description: error.message });
    },
  });

  return { closeMonth: mutation.mutateAsync, isClosing: mutation.isPending };
}
