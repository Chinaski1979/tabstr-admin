import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AdminUser } from "@/types";

const { mockUseAdminUsers, mockUseAuth, mockDeleteAdminUser } = vi.hoisted(() => ({
  mockUseAdminUsers: vi.fn(),
  mockUseAuth: vi.fn(),
  mockDeleteAdminUser: vi.fn(),
}));

vi.mock("@/hooks/useAdminUsers", () => ({
  useAdminUsers: mockUseAdminUsers,
  useDeleteAdminUser: () => ({ deleteAdminUser: mockDeleteAdminUser, isDeleting: false }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: mockUseAuth,
}));

import AdminsPage from "@/pages/AdminsPage";

const admins: AdminUser[] = [
  {
    id: "me",
    email: "me@tabstr.com",
    role: "full_access",
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    id: "other",
    email: "other@tabstr.com",
    role: "standard",
    isActive: true,
    createdAt: new Date("2026-02-01T00:00:00.000Z"),
  },
];

describe("AdminsPage", () => {
  beforeEach(() => {
    mockUseAdminUsers.mockReset();
    mockUseAuth.mockReset();
    mockDeleteAdminUser.mockReset();
  });

  it("shows a loading state", () => {
    mockUseAuth.mockReturnValue({ user: { id: "me" }, isFullAccess: true });
    mockUseAdminUsers.mockReturnValue({ admins: [], isLoading: true, error: null });
    render(<AdminsPage />);
    expect(screen.getByText("Administrators")).toBeInTheDocument();
    expect(screen.queryByText("me@tabstr.com")).not.toBeInTheDocument();
  });

  it("hides delete actions for non full-access users", () => {
    mockUseAuth.mockReturnValue({ user: { id: "me" }, isFullAccess: false });
    mockUseAdminUsers.mockReturnValue({ admins, isLoading: false, error: null });
    render(<AdminsPage />);
    expect(screen.queryByRole("button", { name: /Delete administrator/ })).not.toBeInTheDocument();
  });

  it("shows delete for other admins and disables it for the current user", () => {
    mockUseAuth.mockReturnValue({ user: { id: "me" }, isFullAccess: true });
    mockUseAdminUsers.mockReturnValue({ admins, isLoading: false, error: null });
    render(<AdminsPage />);

    expect(screen.getByRole("button", { name: "Cannot delete your own account" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete administrator other@tabstr.com" })).toBeEnabled();
  });
});
