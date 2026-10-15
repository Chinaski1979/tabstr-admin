import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { buildRevenueOverview } from "@/lib/revenue";

const { mockGetOverview } = vi.hoisted(() => ({
  mockGetOverview: vi.fn(),
}));

vi.mock("@/services/revenue/revenueService", () => ({
  revenueService: { getOverview: mockGetOverview },
}));

import { useRevenue } from "@/hooks/useRevenue";

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useRevenue", () => {
  beforeEach(() => {
    mockGetOverview.mockReset();
  });

  it("returns the overview from the service", async () => {
    const overview = buildRevenueOverview([], [], new Date("2026-10-15T12:00:00.000Z"));
    mockGetOverview.mockResolvedValue(overview);

    const { result } = renderHook(() => useRevenue(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.overview).toEqual(overview);
    expect(result.current.error).toBeNull();
    expect(mockGetOverview).toHaveBeenCalledTimes(1);
  });

  it("surfaces a service error", async () => {
    mockGetOverview.mockRejectedValue(new Error("RLS denied"));

    const { result } = renderHook(() => useRevenue(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.overview).toBeNull();
    expect((result.current.error as Error).message).toBe("RLS denied");
  });
});
