import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

const { mockUseOrgDeleteCapability, mockUseOrgDeleteDryRun, mockUseExecuteOrgDelete } = vi.hoisted(
  () => ({
    mockUseOrgDeleteCapability: vi.fn(),
    mockUseOrgDeleteDryRun: vi.fn(),
    mockUseExecuteOrgDelete: vi.fn(),
  }),
);

vi.mock("@/hooks/useOrgDelete", () => ({
  useOrgDeleteCapability: mockUseOrgDeleteCapability,
  useOrgDeleteDryRun: mockUseOrgDeleteDryRun,
  useExecuteOrgDelete: mockUseExecuteOrgDelete,
}));

import { DeleteOrganizationDialog } from "../DeleteOrganizationDialog";
import type { AuditReport, DryRunPlan, OrganizationRegistry } from "@/types";

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

const PLAN: DryRunPlan = {
  slug: "acme",
  orgRegistryId: "registry-1",
  orgId: "org-uuid",
  projectId: "project-1",
  execSqlPresent: true,
  counts: [
    { table: "tabs", count: 12, skipped: false },
    { table: "kitchen_ticket_items", count: -1, skipped: true },
  ],
  orgUserIds: ["user-1"],
  orgUsers: [{ userId: "user-1", inOtherOrgs: false }],
  sqlStatements: ["DELETE FROM organizations WHERE id = 'org-uuid'"],
  registryPlan: [
    { table: "organization_features", fkColumn: "organization_id", disposition: "allowed" },
  ],
  errors: [],
};

const REPORT: AuditReport = {
  id: "report-1",
  slug: "acme",
  orgRegistryId: "registry-1",
  orgId: "org-uuid",
  projectId: "project-1",
  startedAt: "2026-01-02T10:00:00.000Z",
  finishedAt: "2026-01-02T10:00:05.000Z",
  durationMs: 5000,
  aborted: false,
  abortReason: null,
  success: true,
  execSqlPresent: true,
  counts: [{ table: "tabs", count: 12, skipped: false }],
  orgUsers: [],
  executedSql: [{ sql: "DELETE FROM organizations WHERE id = 'org-uuid'", ok: true }],
  triggersReenabled: true,
  triggerErrors: [],
  registryCleanup: [
    {
      table: "subscription_invoices",
      fkColumn: "subscription_id",
      disposition: "pending-server-side",
      status: "pending-server-side",
      rowCount: null,
      reason: "Registry RLS denies admin deletes.",
      manualSql: "DELETE FROM public.subscription_invoices WHERE subscription_id IN (...);",
    },
  ],
  errors: [],
};

function mockHooks({
  capabilityEnabled = true,
  plan = PLAN as DryRunPlan | undefined,
  report = null as AuditReport | null,
  isExecuting = false,
} = {}) {
  mockUseOrgDeleteCapability.mockReturnValue({
    capability: {
      enabled: capabilityEnabled,
      reason: capabilityEnabled ? undefined : "Missing VITE_SHARED_PROJECT_2_SERVICE_KEY for this project",
      liveProbe: capabilityEnabled ? "ok" : "skipped",
    },
    isLoading: false,
  });
  mockUseOrgDeleteDryRun.mockReturnValue({
    plan: capabilityEnabled ? plan : undefined,
    isLoading: false,
    error: null,
  });
  mockUseExecuteOrgDelete.mockReturnValue({
    execute: vi.fn(),
    executeAsync: vi.fn(),
    isExecuting,
    report,
    error: null,
    reset: vi.fn(),
  });
}

function renderDialog() {
  return render(
    <MemoryRouter>
      <DeleteOrganizationDialog organization={ORG} open onOpenChange={vi.fn()} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUseOrgDeleteCapability.mockReset();
  mockUseOrgDeleteDryRun.mockReset();
  mockUseExecuteOrgDelete.mockReset();
});

describe("DeleteOrganizationDialog", () => {
  it("keeps Execute disabled until the slug matches exactly and the checkbox is checked", async () => {
    const user = userEvent.setup();
    mockHooks();
    renderDialog();

    // Step 1 — dry-run plan.
    expect(screen.getByText("Rows to delete")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 2 — confirmation.
    const executeButton = screen.getByRole("button", { name: "Delete acme" });
    expect(executeButton).toBeDisabled();

    const slugInput = screen.getByLabelText(/type acme to confirm/i);
    await user.type(slugInput, "acm");
    expect(executeButton).toBeDisabled();

    await user.type(slugInput, "e");
    expect(executeButton).toBeDisabled(); // checkbox not acknowledged yet

    await user.click(screen.getByRole("checkbox"));
    expect(executeButton).toBeEnabled();
  });

  it("regenerates the disabled state when the slug stops matching", async () => {
    const user = userEvent.setup();
    mockHooks();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    const executeButton = screen.getByRole("button", { name: "Delete acme" });
    const slugInput = screen.getByLabelText(/type acme to confirm/i);

    await user.type(slugInput, "acme");
    await user.click(screen.getByRole("checkbox"));
    expect(executeButton).toBeEnabled();

    await user.type(slugInput, "x");
    expect(executeButton).toBeDisabled();
  });

  it("blocks the flow at step 1 when capability is disabled, showing the reason and a skeleton preview", () => {
    mockHooks({ capabilityEnabled: false });
    renderDialog();

    expect(
      screen.getByText(/Deletion is not available for this organization/i),
    ).toHaveTextContent("Missing VITE_SHARED_PROJECT_2_SERVICE_KEY for this project");
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Delete acme" })).not.toBeInTheDocument();

    // Capability-free preview: labeled skeleton SQL + registry plan, no counts.
    expect(screen.getByText(/Preview — requires the project service key/i)).toBeInTheDocument();
    expect(
      screen.getByText("DELETE FROM organizations WHERE id = '<organization-id>'"),
    ).toBeInTheDocument();
    expect(screen.getByText("No row counts were collected.")).toBeInTheDocument();
    expect(screen.getByText("organization_registry")).toBeInTheDocument();
  });
});
