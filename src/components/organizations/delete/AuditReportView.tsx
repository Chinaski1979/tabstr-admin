import { AlertTriangle, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CountsTable } from "./CountsTable";
import { downloadAuditReport } from "@/services/orgDelete/orgDeleteAudit";
import { cn, formatDate } from "@/lib/utils";
import type { AuditReport, RegistryCleanupStatus } from "@/types";

const STATUS_LABEL: Record<RegistryCleanupStatus, string> = {
  deleted: "Deleted",
  "pending-server-side": "Pending server-side",
  skipped: "Skipped",
  failed: "Failed",
};

function statusBadgeClass(status: RegistryCleanupStatus): string {
  switch (status) {
    case "deleted":
      return "bg-success text-success-foreground border-transparent";
    case "pending-server-side":
      return "bg-amber-500/15 text-amber-700 border-amber-500/40 dark:text-amber-400";
    case "failed":
      return "bg-destructive text-destructive-foreground border-transparent";
    default:
      return "border-input text-muted-foreground";
  }
}

function shortId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

/**
 * Step 3 of the delete dialog: full audit report of what was (or was not)
 * deleted, including pending manual registry cleanup and executed SQL.
 */
export function AuditReportView({ report }: { report: AuditReport }) {
  const pendingRegistryRows = report.registryCleanup.filter(
    (r) => r.status === "pending-server-side",
  );
  const hasIssues = report.aborted || !report.success || report.errors.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={
            report.aborted || report.phase2DeleteOk === false
              ? "destructive"
              : report.success
                ? "success"
                : "secondary"
          }
        >
          {report.aborted
            ? "Aborted"
            : report.phase2DeleteOk === false
              ? "Failed — not deleted"
              : report.success
                ? "Completed"
                : "Completed with issues"}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {formatDate(report.startedAt)} · {(report.durationMs / 1000).toFixed(1)}s
        </span>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => downloadAuditReport(report)}
        >
          <Download className="h-4 w-4" />
          Download JSON
        </Button>
      </div>

      {report.abortReason && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Deletion aborted: {report.abortReason}
        </div>
      )}

      {!report.triggersReenabled && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            History triggers could not be re-enabled — check them manually.
          </p>
          <ul className="mt-1 list-disc pl-4">
            {report.triggerErrors.map((message, index) => (
              <li key={`${index}-${message.slice(0, 24)}`}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Pre-deletion row counts</h3>
        <CountsTable counts={report.counts} />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Organization users</h3>
        {report.orgUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No organization members found.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {report.orgUsers.map((user) => (
              <li key={user.userId} className="flex items-center gap-2 text-xs">
                <span className="font-mono">{shortId(user.userId)}</span>
                {user.inOtherOrgs && (
                  <Badge variant="secondary">belongs to other organizations</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Registry cleanup</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead className="w-40">Status</TableHead>
                <TableHead className="w-16 text-right">Rows</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.registryCleanup.map((row) => (
                <TableRow key={row.table}>
                  <TableCell className="font-mono text-xs">{row.table}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(statusBadgeClass(row.status))}>
                      {STATUS_LABEL[row.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.rowCount ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {report.registryCleanup
          .filter((row) => row.reason || row.error)
          .map((row) => (
            <p key={`${row.table}-reason`} className="text-xs text-muted-foreground">
              <span className="font-mono">{row.table}</span>: {row.reason}
              {row.error ? ` (${row.error})` : ""}
            </p>
          ))}
      </section>

      {pendingRegistryRows.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Pending server-side cleanup
          </h3>
          <p className="text-xs text-muted-foreground">
            These registry tables cannot be deleted from the browser session. Run the SQL below
            server-side with <code className="font-mono">REGISTRY_SERVICE_ROLE_KEY</code> (see{" "}
            <code className="font-mono">scripts/lib/migrator.ts</code>).
          </p>
          {pendingRegistryRows.map((row) => (
            <div key={`${row.table}-manual`} className="flex flex-col gap-1">
              <p className="text-xs font-medium">{row.table}</p>
              <pre className="overflow-x-auto rounded-md border bg-muted/50 p-2 text-xs">
                {row.manualSql ?? "—"}
              </pre>
            </div>
          ))}
        </section>
      )}

      {report.executedSql.length > 0 && (
        <details className="rounded-md border">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium">
            Executed SQL ({report.executedSql.length} statements)
          </summary>
          <ol className="flex flex-col gap-1 border-t px-3 py-2">
            {report.executedSql.map((entry, index) => (
              <li key={`${index}-${entry.sql.slice(0, 24)}`} className="flex gap-2">
                <span
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full text-center text-[10px] leading-3.5 text-white",
                    entry.ok ? "bg-success" : "bg-destructive",
                  )}
                  title={entry.ok ? "OK" : entry.error}
                >
                  {entry.ok ? "✓" : "✗"}
                </span>
                <code className="break-all font-mono text-xs">{entry.sql}</code>
              </li>
            ))}
          </ol>
        </details>
      )}

      {hasIssues && report.errors.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-destructive">Errors</h3>
          <ul className="list-disc pl-4 text-xs text-destructive">
            {report.errors.map((message, index) => (
              <li key={`${index}-${message.slice(0, 24)}`}>{message}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
