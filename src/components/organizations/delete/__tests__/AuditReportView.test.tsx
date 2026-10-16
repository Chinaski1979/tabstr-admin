import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AuditReportView } from "../AuditReportView";
import type { AuditReport } from "@/types";

function makeReport(overrides: Partial<AuditReport> = {}): AuditReport {
  return {
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
    counts: [
      { table: "tabs", count: 12, skipped: false },
      { table: "kitchen_ticket_items", count: -1, skipped: true },
    ],
    orgUsers: [
      { userId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", inOtherOrgs: true },
      { userId: "ffffffff-0000-1111-2222-333333333333", inOtherOrgs: false },
    ],
    executedSql: [{ sql: "DELETE FROM organizations WHERE id = 'org-uuid'", ok: true }],
    triggersReenabled: true,
    triggerErrors: [],
    registryCleanup: [],
    errors: [],
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AuditReportView", () => {
  it("renders the pending server-side section with manual SQL", () => {
    render(
      <AuditReportView
        report={makeReport({
          success: true,
          registryCleanup: [
            {
              table: "subscription_invoices",
              fkColumn: "subscription_id",
              disposition: "pending-server-side",
              status: "pending-server-side",
              rowCount: null,
              reason: "Registry RLS denies admin deletes (select-only policy/grant).",
              manualSql: "DELETE FROM public.subscription_invoices WHERE subscription_id IN (SELECT id FROM public.subscriptions WHERE organization_registry_id = 'registry-1');",
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("Pending server-side cleanup")).toBeInTheDocument();
    expect(screen.getAllByText("subscription_invoices").length).toBeGreaterThan(0);
    expect(screen.getByText(/REGISTRY_SERVICE_ROLE_KEY/)).toBeInTheDocument();
    expect(
      screen.getByText(/DELETE FROM public\.subscription_invoices/),
    ).toBeInTheDocument();
  });

  it("hides the pending section when nothing is pending", () => {
    render(
      <AuditReportView
        report={makeReport({
          registryCleanup: [
            {
              table: "organization_features",
              fkColumn: "organization_id",
              disposition: "allowed",
              status: "deleted",
              rowCount: 3,
            },
          ],
        })}
      />,
    );

    expect(screen.queryByText("Pending server-side cleanup")).not.toBeInTheDocument();
    expect(screen.getByText("Deleted")).toBeInTheDocument();
  });

  it("marks members that belong to other organizations", () => {
    render(<AuditReportView report={makeReport()} />);

    expect(screen.getAllByText("belongs to other organizations")).toHaveLength(1);
    expect(screen.getByText(/aaaaaaaa…eeee/)).toBeInTheDocument();
  });

  it("shows the abort reason for aborted runs", () => {
    render(
      <AuditReportView
        report={makeReport({
          aborted: true,
          success: false,
          abortReason: "crear exec_sql en la DB del proyecto project-1",
          execSqlPresent: false,
          registryCleanup: [],
        })}
      />,
    );

    expect(screen.getByText("Aborted")).toBeInTheDocument();
    expect(screen.getByText(/crear exec_sql en la DB del proyecto project-1/)).toBeInTheDocument();
  });

  it("downloads the report JSON", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => "blob:mock");
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    render(<AuditReportView report={makeReport()} />);
    await user.click(screen.getByRole("button", { name: /download json/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
