import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useExecuteOrgDelete,
  useOrgDeleteCapability,
  useOrgDeleteDryRun,
} from "@/hooks/useOrgDelete";
import { buildAllStatements, REGISTRY_TABLES } from "@/services/orgDelete/orgDeleteTables";
import { DryRunPlanView } from "./DryRunPlanView";
import { AuditReportView } from "./AuditReportView";
import { cn } from "@/lib/utils";
import type { DryRunPlan, OrganizationRegistry } from "@/types";

type Step = 1 | 2 | 3;

interface DeleteOrganizationDialogProps {
  /** Null while no organization is targeted. */
  organization: OrganizationRegistry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEP_LABELS: Record<Step, string> = {
  1: "Review dry-run",
  2: "Confirm",
  3: "Result",
};

/**
 * Three-step recursive delete: (1) dry-run plan, (2) type the exact slug +
 * acknowledge, (3) progress + audit report.
 */
export function DeleteOrganizationDialog({
  organization,
  open,
  onOpenChange,
}: DeleteOrganizationDialogProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [slugInput, setSlugInput] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  const { capability } = useOrgDeleteCapability(organization);
  const { plan, isLoading: isLoadingPlan, error: planError } = useOrgDeleteDryRun(
    organization,
    open && capability.enabled,
  );
  const { execute, isExecuting, report, error: executeError, reset } = useExecuteOrgDelete();

  const slug = organization?.organizationSlug ?? "";
  const slugMatches = slugInput === slug && slug.length > 0;
  const canExecute = slugMatches && acknowledged && !isExecuting && !report;
  const totalRows = plan
    ? plan.counts.reduce((sum, entry) => sum + Math.max(0, entry.count), 0)
    : null;

  // Capability-free skeleton for the disabled state: the SQL and registry plan
  // come from the pure builders, so no service key (and no counts) is needed.
  const previewPlan = useMemo<DryRunPlan>(
    () => ({
      slug,
      orgRegistryId: "",
      orgId: "",
      projectId: capability.projectId ?? "",
      execSqlPresent: true,
      counts: [],
      orgUserIds: [],
      orgUsers: [],
      sqlStatements: buildAllStatements("<organization-id>"),
      registryPlan: [...REGISTRY_TABLES],
      errors: [],
    }),
    [slug, capability.projectId],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isExecuting) return; // never close mid-deletion
    onOpenChange(nextOpen);
    if (!nextOpen) {
      const finishedSuccessfully = !!report && !report.aborted && report.success;
      setStep(1);
      setSlugInput("");
      setAcknowledged(false);
      reset();
      if (finishedSuccessfully) navigate("/organizations");
    }
  };

  const handleExecute = () => {
    if (!organization || !canExecute) return;
    setStep(3);
    execute({ organization, confirmSlug: slugInput });
  };

  return (
    <Dialog open={open && !!organization} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(90dvh,100%)] gap-4 overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="text-destructive">
            Delete {slug} permanently
          </DialogTitle>
          <DialogDescription>
            Recursively removes the organization&apos;s data from its project database and its
            registry entry. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <ol className="flex items-center gap-2 text-xs text-muted-foreground">
          {([1, 2, 3] as Step[]).map((value) => (
            <li key={value} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                  step === value
                    ? "bg-destructive text-destructive-foreground"
                    : step > value
                      ? "bg-success text-success-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {value}
              </span>
              {STEP_LABELS[value]}
              {value < 3 && <span className="mx-1 h-px w-6 bg-border" aria-hidden />}
            </li>
          ))}
        </ol>

        {step === 1 && (
          <div className="flex flex-col gap-3">
            {!capability.enabled ? (
              <>
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Deletion is not available for this organization: {capability.reason}
                </div>
                <p className="text-xs text-muted-foreground">
                  Preview — requires the project service key to resolve the organization id and
                  row counts; the statements below are a generic skeleton:
                </p>
                <DryRunPlanView plan={previewPlan} isLoading={false} />
              </>
            ) : (
              <DryRunPlanView plan={plan} isLoading={isLoadingPlan} error={planError} />
            )}
          </div>
        )}

        {step === 2 && organization && (
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              This will permanently delete{" "}
              {totalRows !== null ? (
                <span className="font-semibold">
                  {totalRows.toLocaleString()} rows
                  {" "}
                </span>
              ) : null}
              from <span className="font-mono text-sm">{slug}</span>&apos;s database (all tabs,
              sales, products, users and more) plus its registry entry.
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-delete-slug">
                Type <span className="font-mono">{slug}</span> to confirm
              </Label>
              <Input
                id="confirm-delete-slug"
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
                placeholder={slug}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-destructive"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              I understand this action is irreversible and requires a manual follow-up for some
              registry tables.
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            {isExecuting && (
              <div className="flex items-center gap-3 rounded-md border px-3 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-destructive" />
                <span>
                  Deleting <span className="font-mono">{slug}</span> — running cleanup phases and
                  collecting the audit report…
                </span>
              </div>
            )}
            {!isExecuting && executeError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Deletion failed: {executeError.message}
              </div>
            )}
            {!isExecuting && !executeError && report && <AuditReportView report={report} />}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 1 && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!capability.enabled || isLoadingPlan || !plan}
                onClick={() => setStep(2)}
                className="w-full sm:w-auto"
              >
                Continue
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isExecuting}
                onClick={() => setStep(1)}
                className="w-full sm:w-auto"
              >
                Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!canExecute}
                onClick={handleExecute}
                className="w-full sm:w-auto"
              >
                {isExecuting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete {slug}
              </Button>
            </>
          )}
          {step === 3 && (
            <Button
              type="button"
              variant={report ? "outline" : "destructive"}
              disabled={isExecuting}
              onClick={() => handleOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
