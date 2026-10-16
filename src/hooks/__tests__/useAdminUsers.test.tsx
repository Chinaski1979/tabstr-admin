import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { AdminUser } from "@/types";

const { mockGetAll, mockDelete, mockToastSuccess } = vi.hoisted(() => ({
  mockGetAll: vi.fn(),
  mockDelete: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

vi.mock("@/services/adminUsers/adminUsersService", () => ({
  adminUsersService: {
    getAll: mockGetAll,
    delete: mockDelete,
  },
}));

vi.mock("sonner", () => ({
  toast: { success: mockToastSuccess, error: vi.fn() },
}));

import { useAdminUsers, useDeleteAdminUser } from "@/hooks/useAdminUsers";

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const admin: AdminUser = {
  id: "other",
  email: "other@tabstr.com",
  role: "standard",
  isActive: true,
  createdAt: new Date("2026-02-01T00:00:00.000Z"),
};

describe("useAdminUsers", () => {
  beforeEach(() => {
    mockGetAll.mockReset();
    mockDelete.mockReset();
    mockToastSuccess.mockReset();
  });

  it("returns admins from the service", async () => {
    mockGetAll.mockResolvedValue([admin]);

    const { result } = renderHook(() => useAdminUsers(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.admins).toEqual([admin]);
  });

  it("deletes an admin and toasts", async () => {
    mockGetAll.mockResolvedValue([admin]);
    mockDelete.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteAdminUser(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.deleteAdminUser(admin);
    });

    expect(mockDelete).toHaveBeenCalledWith("other");
    expect(mockToastSuccess).toHaveBeenCalledWith("Administrator removed", {
      description: "other@tabstr.com",
    });
  });
});
