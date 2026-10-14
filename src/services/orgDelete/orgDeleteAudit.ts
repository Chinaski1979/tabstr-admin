import type { AuditReport } from "@/types";

/** localStorage key for saved audit reports. */
export const AUDIT_STORAGE_KEY = "tabstr-org-delete-audit";

/** Newest-first cap — older reports are dropped. */
export const AUDIT_MAX_REPORTS = 20;

/**
 * Persists an audit report locally (newest first, capped).
 * localStorage failures never break the deletion flow — the report is still
 * returned to the caller and shown in the dialog.
 */
export function saveAuditReport(report: AuditReport): AuditReport[] {
  const existing = listAuditReports();
  const next = [report, ...existing.filter((r) => r.id !== report.id)].slice(
    0,
    AUDIT_MAX_REPORTS,
  );
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota or privacy mode — keep the in-memory result only.
  }
  return next;
}

/** Saved reports, newest first, optionally filtered by organization slug. */
export function listAuditReports(slug?: string): AuditReport[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(AUDIT_STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const reports = parsed as AuditReport[];
  return slug ? reports.filter((r) => r.slug === slug) : reports;
}

/** Triggers a browser download of the report as pretty-printed JSON. */
export function downloadAuditReport(report: AuditReport): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `org-delete-${report.slug}-${Date.now()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
