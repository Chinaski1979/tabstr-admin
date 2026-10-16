import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AdminUser } from "@/types";

const { mockDeleteAdminUser } = vi.hoisted(() => ({
  mockDeleteAdminUser: vi.fn(),
}));

vi.mock("@/hooks/useAdminUsers", () => ({
  useDeleteAdminUser: () => ({ deleteAdminUser: mockDeleteAdminUser, isDeleting: false }),
}));

import { DeleteAdminUserButton } from "@/components/admins/DeleteAdminUserButton";

const admin: AdminUser = {
  id: "other",
  email: "other@tabstr.com",
  role: "standard",
  isActive: true,
  createdAt: new Date("2026-02-01T00:00:00.000Z"),
};

describe("DeleteAdminUserButton", () => {
  beforeEach(() => {
    mockDeleteAdminUser.mockReset();
    mockDeleteAdminUser.mockResolvedValue(undefined);
  });

  it("confirms before deleting", async () => {
    const user = userEvent.setup();
    render(<DeleteAdminUserButton admin={admin} isCurrentUser={false} />);

    await user.click(screen.getByRole("button", { name: "Delete administrator other@tabstr.com" }));
    expect(screen.getByText("Remove other@tabstr.com?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(mockDeleteAdminUser).toHaveBeenCalledWith(admin);
  });

  it("does not delete the current user", () => {
    render(<DeleteAdminUserButton admin={admin} isCurrentUser />);
    expect(screen.getByRole("button", { name: "Cannot delete your own account" })).toBeDisabled();
  });
});
