import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { BusinessScorecard } from "@/types";

const { mockGetScorecard } = vi.hoisted(() => ({
  mockGetScorecard: vi.fn(),
}));

vi.mock("@/services/business/businessService", () => ({
  businessService: {
    getScorecard: mockGetScorecard,
    closeMonth: vi.fn(),
  },
}));

import { useBusiness } from "@/hooks/useBusiness";

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const scorecard: BusinessScorecard = {
  asOfMonth: "2026-10",
  health: {
    month: "2026-10",
    contractedMrr: 0,
    arrProjection: 0,
    activeCustomers: 0,
    arpu: null,
    newLogos: 0,
    collected: 0,
    paidCustomers: 0,
    collectionRate: null,
    atRisk: [],
  },
  plans: [],
  invoices: [],
  closes: [],
  snapshots: [],
};

describe("useBusiness", () => {
  beforeEach(() => {
    mockGetScorecard.mockReset();
  });

  it("returns the scorecard from the service", async () => {
    mockGetScorecard.mockResolvedValue(scorecard);

    const { result } = renderHook(() => useBusiness(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.scorecard).toEqual(scorecard);
    expect(result.current.error).toBeNull();
  });

  it("surfaces a service error", async () => {
    mockGetScorecard.mockRejectedValue(new Error("RLS denied"));

    const { result } = renderHook(() => useBusiness(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.scorecard).toBeNull();
  });
});
