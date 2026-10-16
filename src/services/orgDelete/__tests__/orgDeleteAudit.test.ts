import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  AUDIT_MAX_REPORTS,
  AUDIT_STORAGE_KEY,
  downloadAuditReport,
  listAuditReports,
  saveAuditReport,
} from "../orgDeleteAudit";
import type { AuditReport } from "@/types";

function makeReport(slug: string, id: string): AuditReport {
  return {
    id,
    slug,
    orgRegistryId: "registry-1",
    orgId: "org-1",
    projectId: "project-1",
    startedAt: "2026-01-02T10:00:00.000Z",
    finishedAt: "2026-01-02T10:00:05.000Z",
    durationMs: 5000,
    aborted: false,
    abortReason: null,
    success: true,
    execSqlPresent: true,
    counts: [{ table: "tabs", count: 3, skipped: false }],
    orgUsers: [],
    executedSql: [{ sql: "DELETE FROM organizations WHERE id = 'org-1'", ok: true }],
    triggersReenabled: true,
    triggerErrors: [],
    registryCleanup: [],
    errors: [],
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("audit report persistence", () => {
  it("saves reports newest first", () => {
    saveAuditReport(makeReport("acme", "r1"));
    saveAuditReport(makeReport("acme", "r2"));

    const reports = listAuditReports();
    expect(reports.map((r) => r.id)).toEqual(["r2", "r1"]);
  });

  it("caps storage at 20 reports, dropping the oldest", () => {
    for (let i = 0; i < AUDIT_MAX_REPORTS + 5; i += 1) {
      saveAuditReport(makeReport("acme", `r${i}`));
    }
    const reports = listAuditReports();
    expect(reports).toHaveLength(AUDIT_MAX_REPORTS);
    expect(reports[0].id).toBe(`r${AUDIT_MAX_REPORTS + 4}`);
    expect(reports[reports.length - 1].id).toBe("r5");
  });

  it("deduplicates by report id", () => {
    saveAuditReport(makeReport("acme", "r1"));
    saveAuditReport(makeReport("acme", "r2"));
    saveAuditReport(makeReport("acme", "r1"));

    expect(listAuditReports().map((r) => r.id)).toEqual(["r1", "r2"]);
  });

  it("filters by slug", () => {
    saveAuditReport(makeReport("acme", "r1"));
    saveAuditReport(makeReport("beta", "r2"));

    expect(listAuditReports("acme").map((r) => r.id)).toEqual(["r1"]);
  });

  it("returns an empty list for corrupted storage", () => {
    localStorage.setItem(AUDIT_STORAGE_KEY, "{not json");
    expect(listAuditReports()).toEqual([]);
    localStorage.setItem(AUDIT_STORAGE_KEY, '{"nope": true}');
    expect(listAuditReports()).toEqual([]);
  });

  it("downloads the report as org-delete-<slug>-<ts>.json", () => {
    const createObjectURL = vi.fn(() => "blob:mock");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    downloadAuditReport(makeReport("acme", "r1"));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");
    vi.unstubAllGlobals();
  });
});
