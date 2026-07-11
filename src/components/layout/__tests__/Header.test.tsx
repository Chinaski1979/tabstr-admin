import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: mockUseAuth,
}));

import { Header } from "@/components/layout/Header";
import { SidebarNav } from "@/components/layout/SidebarNav";

function renderWithRouter(ui: React.ReactElement, initialEntries = ["/"]) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}

describe("SidebarNav", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("hides full-access-only links for standard admins", () => {
    mockUseAuth.mockReturnValue({ isFullAccess: false });
    renderWithRouter(<SidebarNav />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Organizations" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Revenue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Administrators" })).not.toBeInTheDocument();
  });

  it("shows full-access-only links for full-access admins", () => {
    mockUseAuth.mockReturnValue({ isFullAccess: true });
    renderWithRouter(<SidebarNav />);

    expect(screen.getByRole("link", { name: "Revenue" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Administrators" })).toBeInTheDocument();
  });

  it("calls onNavigate when a link is clicked", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    mockUseAuth.mockReturnValue({ isFullAccess: false });
    renderWithRouter(<SidebarNav onNavigate={onNavigate} />);

    await user.click(screen.getByRole("link", { name: "Organizations" }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});

describe("Header mobile navigation", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({
      user: { email: "admin@tabstr.com" },
      role: "standard",
      isFullAccess: false,
      signOut: vi.fn(),
    });
  });

  it("opens a sheet with navigation links from the menu button", async () => {
    const user = userEvent.setup();
    renderWithRouter(<Header />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open navigation" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Organizations" })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Feature flags" })).toBeInTheDocument();
  });

  it("closes the sheet after choosing a destination", async () => {
    const user = userEvent.setup();
    renderWithRouter(<Header />);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("link", { name: "Subscriptions" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
