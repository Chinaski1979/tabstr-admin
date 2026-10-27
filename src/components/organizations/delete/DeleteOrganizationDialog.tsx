import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, AlertTriangle } from "lucide-react";

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
  useExecuteRegistryOnlyDelete,
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
 * Supports both full recursive delete (shared project) and registry-only delete
 * (organizations not on shared projects, full-access admins only).
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

  // Detect registry-only mode: full-access admin + org not on shared project
  const isRegistryOnlyMode =
    !capability.enabled &&
    capability.disabledReason === "not-on-shared-project";

  // Use the appropriate mutation based on mode
  const {
    execute: executeFull,
    isExecuting: isExecutingFull,
    report: reportFull,
    error: executeErrorFull,
    reset: resetFull,
  } = useExecuteOrgDelete();

  const {
    execute: executeRegistryOnly,
    isExecuting: isExecutingRegistryOnly,
    report: reportRegistryOnly,
    error: executeErrorRegistryOnly,
    reset: resetRegistryOnly,
  } = useExecuteRegistryOnlyDelete();

  const isExecuting = isRegistryOnlyMode ? isExecutingRegistryOnly : isExecutingFull;
  const report = isRegistryOnlyMode ? reportRegistryOnly : reportFull;
  const executeError = isRegistryOnlyMode ? executeErrorRegistryOnly : executeErrorFull;
  const reset = () => {
    resetFull();
    resetRegistryOnly();
  };

  const slug = organization?.organizationSlug ?? "";
  const slugMatches = slugInput === slug && slug.length > 0;
  const canExecute = slugMatches && acknowledged && !isExecuting && !report;
  const totalRows = plan
    ? plan.counts.reduce((sum, entry) => sum + Math.max(0, entry.count), 0)
    : null;

  // Registry-only preview plan: shows only registry tables that will be deleted
  const registryOnlyPreviewPlan = useMemo<DryRunPlan>(
    () => ({
      slug,
      orgRegistryId: "",
      orgId: "",
      projectId: "",
      execSqlPresent: false,
      counts: [],
      orgUserIds: [],
      orgUsers: [],
      sqlStatements: [],
      registryPlan: [...REGISTRY_TABLES],
      errors: [],
    }),
    [slug],
  );

  // Capability-free skeleton for the disabled state (full delete): the SQL and
  // registry plan come from the pure builders, so no service key (and no counts)
  // is needed.
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
    if (isRegistryOnlyMode) {
      executeRegistryOnly({ organization, confirmSlug: slugInput });
    } else {
      executeFull({ organization, confirmSlug: slugInput });
    }
  };

  return (
    <Dialog open={open && !!organization} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(90dvh,100%)] gap-4 overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="text-destructive">
            Delete {slug} permanently
          </DialogTitle>
          <DialogDescription>
            {isRegistryOnlyMode
              ? "Removes the organization from the registry only. The project database is NOT touched. This cannot be undone."
              : "Recursively removes the organization&apos;s data from its project database and its registry entry. This cannot be undone."}
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
            {!capability.enabled && !isRegistryOnlyMode ? (
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
            ) : isRegistryOnlyMode ? (
              <>
                <div className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-50/50 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-medium">Registry-only delete mode</p>
                    <p className="text-xs mt-0.5">
                      This organization is not on a shared project. Only the registry tables listed
                      below will be deleted. The project database will <strong>NOT</strong> be touched.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Preview — registry tables that will be deleted (no project database operations):
                </p>
                <DryRunPlanView plan={registryOnlyPreviewPlan} isLoading={false} />
              </>
            ) : (
              <DryRunPlanView plan={plan} isLoading={isLoadingPlan} error={planError} />
            )}
          </div>
        )}

        {step === 2 && organization && (
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              {isRegistryOnlyMode ? (
                <>
                  This will permanently delete the organization from the registry:
                  <span className="font-mono text-sm ml-1">{slug}</span>
                  . The project database will <strong>NOT</strong> be touched.
                </>
              ) : (
                <>
                  This will permanently delete{" "}
                  {totalRows !== null ? (
                    <span className="font-semibold">
                      {totalRows.toLocaleString()} rows
                      {" "}
                    </span>
                  ) : null}
                  from <span className="font-mono text-sm">{slug}</span>&apos;s database (all tabs,
                  sales, products, users and more) plus its registry entry.
                </>
              )}
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
              {isRegistryOnlyMode ? (
                "I understand this action is irreversible. The organization will be removed from the registry only."
              ) : (
                "I understand this action is irreversible and requires a manual follow-up for some registry tables."
              )}
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            {isExecuting && (
              <div className="flex items-center gap-3 rounded-md border px-3 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-destructive" />
                <span>
                  {isRegistryOnlyMode ? (
                    <>Removing organization {slug} from registry...</>
                  ) : (
                    <>
                      Deleting <span className="font-mono">{slug}</span> — running cleanup phases and collecting the audit report…
                    </>
                  )}
                </span>
              </div>
            )}
            {!isExecuting && executeError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {isRegistryOnlyMode
                  ? "Registry removal failed: "
                  : "Deletion failed: "}{executeError.message}
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
                disabled={
                  isRegistryOnlyMode
                    ? false
                    : !capability.enabled || isLoadingPlan || !plan
                }
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
                {isRegistryOnlyMode ? "Remove from registry" : `Delete ${slug}`}
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
