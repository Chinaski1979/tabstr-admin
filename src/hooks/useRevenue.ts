import { useQuery } from "@tanstack/react-query";
import { revenueService } from "@/services/revenue/revenueService";
import { queryKeys } from "@/lib/queryKeys";
import { STALE_TIME } from "@/lib/queryCacheConfig";
import type { RevenueOverview } from "@/types";

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
