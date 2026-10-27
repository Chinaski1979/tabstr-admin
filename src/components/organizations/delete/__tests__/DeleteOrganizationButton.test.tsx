import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

const {
  mockUseAuth,
  mockUseOrgDeleteCapability,
  mockUseOrgDeleteDryRun,
  mockUseExecuteOrgDelete,
  mockUseExecuteRegistryOnlyDelete,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseOrgDeleteCapability: vi.fn(),
  mockUseOrgDeleteDryRun: vi.fn(),
  mockUseExecuteOrgDelete: vi.fn(),
  mockUseExecuteRegistryOnlyDelete: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@/hooks/useOrgDelete", () => ({
  useOrgDeleteCapability: mockUseOrgDeleteCapability,
  useOrgDeleteDryRun: mockUseOrgDeleteDryRun,
  useExecuteOrgDelete: mockUseExecuteOrgDelete,
  useExecuteRegistryOnlyDelete: mockUseExecuteRegistryOnlyDelete,
}));

import { DeleteOrganizationButton } from "../DeleteOrganizationButton";
import type { OrganizationRegistry } from "@/types";

const ORG: OrganizationRegistry = {
  id: "registry-1",
  organizationSlug: "acme",
  supabaseUrl: "https://jriafwvfwwlduldgdqjf.supabase.co",
  supabaseAnonKey: "anon-key",
  isActive: true,
  isSuspended: false,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ isFullAccess: true });
  mockUseOrgDeleteCapability.mockReset();
  mockUseOrgDeleteDryRun.mockReturnValue({ plan: undefined, isLoading: false, error: null });
  mockUseExecuteOrgDelete.mockReturnValue({
    execute: vi.fn(),
    isExecuting: false,
    report: null,
    error: null,
    reset: vi.fn(),
  });
  mockUseExecuteRegistryOnlyDelete.mockReturnValue({
    execute: vi.fn(),
    isExecuting: false,
    report: null,
    error: null,
    reset: vi.fn(),
  });
});

describe("DeleteOrganizationButton", () => {
  it("is disabled with the reason as tooltip when capability is disabled", () => {
    const reason = "Missing VITE_SHARED_PROJECT_2_SERVICE_KEY for this project";
    mockUseOrgDeleteCapability.mockReturnValue({
      capability: { enabled: false, reason, liveProbe: "skipped" },
      isLoading: false,
    });

    const { container } = render(
      <MemoryRouter>
        <DeleteOrganizationButton organization={ORG} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /delete organization acme/i })).toBeDisabled();
    const wrapper = container.querySelector("span[title]");
    expect(wrapper?.getAttribute("title")).toBe(reason);
  });

  it("stays disabled (and generic) while the capability is loading", () => {
    mockUseOrgDeleteCapability.mockReturnValue({
      capability: { enabled: false, reason: "Checking deletion capability…", liveProbe: "skipped" },
      isLoading: true,
    });

    const { container } = render(
      <MemoryRouter>
        <DeleteOrganizationButton organization={ORG} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /delete organization acme/i })).toBeDisabled();
    expect(container.querySelector("span[title]")?.getAttribute("title")).toBe(
      "Checking deletion capability…",
    );
  });

  it("is enabled when the capability check passes", () => {
    mockUseOrgDeleteCapability.mockReturnValue({
      capability: { enabled: true, projectId: "project-1", liveProbe: "ok" },
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <DeleteOrganizationButton organization={ORG} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /delete organization acme/i })).toBeEnabled();
  });

  it("is disabled for standard-tier admins even when capability passes", () => {
    mockUseAuth.mockReturnValue({ isFullAccess: false });
    mockUseOrgDeleteCapability.mockReturnValue({
      capability: { enabled: true, projectId: "project-1", liveProbe: "ok" },
      isLoading: false,
    });

    const { container } = render(
      <MemoryRouter>
        <DeleteOrganizationButton organization={ORG} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /delete organization acme/i })).toBeDisabled();
    expect(container.querySelector("span[title]")?.getAttribute("title")).toBe(
      "Only full-access admins can delete organizations.",
    );
  });

  it("is enabled for full-access admins when org is not on shared project (registry-only mode)", () => {
    mockUseOrgDeleteCapability.mockReturnValue({
      capability: {
        enabled: false,
        reason: "This organization is not on a configured shared project",
        disabledReason: "not-on-shared-project",
        liveProbe: "skipped",
      },
      isLoading: false,
    });

    const { container } = render(
      <MemoryRouter>
        <DeleteOrganizationButton organization={ORG} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /delete organization acme/i })).toBeEnabled();
    const wrapper = container.querySelector("span[title]");
    expect(wrapper?.getAttribute("title")).toBe(
      "Registry-only delete available (not on shared project)",
    );
  });

  it("is disabled for full-access admins when capability disabled for other reasons", () => {
    mockUseOrgDeleteCapability.mockReturnValue({
      capability: {
        enabled: false,
        reason: "Missing VITE_SHARED_PROJECT_1_SERVICE_KEY for this project",
        liveProbe: "skipped",
      },
      isLoading: false,
    });

    const { container } = render(
      <MemoryRouter>
        <DeleteOrganizationButton organization={ORG} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /delete organization acme/i })).toBeDisabled();
    const wrapper = container.querySelector("span[title]");
    expect(wrapper?.getAttribute("title")).toBe(
      "Missing VITE_SHARED_PROJECT_1_SERVICE_KEY for this project",
    );
  });
});
