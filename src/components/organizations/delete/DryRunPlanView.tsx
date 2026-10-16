import { AlertTriangle, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ErrorState, LoadingState } from "@/components/common/StateViews";
import { CountsTable } from "./CountsTable";
import type { DryRunPlan } from "@/types";

interface DryRunPlanViewProps {
  plan?: DryRunPlan;
  isLoading: boolean;
  error?: unknown;
}

/**
 * Step 1 of the delete dialog: read-only preview of everything the deletion
 * would touch (counts, generated SQL, registry plan).
 */
export function DryRunPlanView({ plan, isLoading, error }: DryRunPlanViewProps) {
  if (isLoading) return <LoadingState className="py-8" />;
  if (error) return <ErrorState error={error} />;
  if (!plan) return <ErrorState error={new Error("No dry-run plan available")} />;

  return (
    <div className="flex flex-col gap-4">
      {!plan.execSqlPresent && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            The <code className="font-mono">exec_sql</code> function is missing in this project
            database — deletion would be aborted. Create it first with{" "}
            <code className="font-mono">scripts/templates/exec_sql.sql</code>.
          </span>
        </div>
      )}

      {plan.errors.length > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            {plan.errors.length} issue(s) found — review before continuing
          </p>
          <ul className="list-disc pl-4 text-xs text-amber-700 dark:text-amber-400">
            {plan.errors.map((message, index) => (
              <li key={`${index}-${message.slice(0, 24)}`}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Rows to delete</h3>
        <CountsTable counts={plan.counts} />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Registry cleanup</h3>
        <ul className="flex flex-col gap-1.5">
          {plan.registryPlan.map((entry) => (
            <li key={entry.table} className="flex items-center justify-between gap-2 text-xs">
              <span className="font-mono">{entry.table}</span>
              <Badge variant={entry.disposition === "allowed" ? "outline" : "secondary"}>
                {entry.disposition === "allowed" ? "deleted by the console" : "manual / server-side"}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      <details className="rounded-md border">
        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium">
          SQL that will run ({plan.sqlStatements.length} statements)
        </summary>
        <ol className="flex flex-col gap-1 border-t px-3 py-2">
          {plan.sqlStatements.map((sql, index) => (
            <li key={`${index}-${sql.slice(0, 24)}`} className="flex gap-2">
              <span className="w-6 shrink-0 select-none text-right font-mono text-xs text-muted-foreground">
                {index + 1}.
              </span>
              <code className="break-all font-mono text-xs">{sql}</code>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
