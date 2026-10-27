import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys } from "@/lib/queryKeys";
import { STALE_TIME } from "@/lib/queryCacheConfig";
import {
  buildDryRunPlan,
  executeOrgDelete,
  executeRegistryOnlyDelete,
  listAuditReports,
  probeDeleteCapability,
  saveAuditReport,
} from "@/services/orgDelete";
import { useAuthStore } from "@/stores/authStore";
import type { AuditReport, DryRunPlan, OrgDeleteCapabilityProbe, OrganizationRegistry } from "@/types";

/**
 * Deletion capability for an organization's project. Keyed by supabaseUrl +
 * organizationSlug — the probe validates the shared project + service key AND
 * that this org's slug exists, so an org-specific failure must never be served
 * to another org on the same project. Execution re-checks everything per
 * organization. Pass `null` while no organization is selected (query disabled).
 */
export function useOrgDeleteCapability(organization: OrganizationRegistry | null) {
  const {
    data,
    isPending: isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<OrgDeleteCapabilityProbe>({
    queryKey: queryKeys.orgDeleteCapability(
      organization?.supabaseUrl ?? "",
      organization?.organizationSlug ?? "",
    ),
    queryFn: () => probeDeleteCapability(organization as OrganizationRegistry),
    enabled: !!organization,
    staleTime: STALE_TIME.orgDeleteCapability,
    retry: false,
  });

  const capability: OrgDeleteCapabilityProbe = data ?? {
    enabled: false,
    reason: "Checking deletion capability…",
    liveProbe: "skipped",
  };

  return { capability, isLoading, isFetching, error, refetch };
}

/** Dry-run plan — only fetched while the delete dialog is open on a capable org. */
export function useOrgDeleteDryRun(organization: OrganizationRegistry | null, enabled: boolean) {
  const {
    data: plan,
    isPending: isLoading,
    error,
    refetch,
  } = useQuery<DryRunPlan>({
    queryKey: queryKeys.orgDeleteDryRun(organization?.organizationSlug ?? ""),
    queryFn: () => buildDryRunPlan(organization as OrganizationRegistry),
    enabled: enabled && !!organization && organization.organizationSlug.length > 0,
    staleTime: 0, // counts change constantly — always fresh for a new dialog session
    retry: false,
  });

  return { plan, isLoading, error, refetch };
}

/**
 * Executes the recursive delete. Always resolves with an AuditReport
 * (aborted/partial included); throws only for capability/guard failures.
 */
export function useExecuteOrgDelete() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    AuditReport,
    Error,
    { organization: OrganizationRegistry; confirmSlug: string }
  >({
    mutationFn: ({ organization, confirmSlug }) => executeOrgDelete(organization, confirmSlug),
    onSuccess: (report) => {
      saveAuditReport(report);

      const pendingRegistryRows = report.registryCleanup.filter(
        (r) => r.status === "pending-server-side",
      ).length;
      if (report.aborted) {
        toast.error("Organization deletion aborted", {
          description: report.abortReason ?? undefined,
        });
      } else if (report.phase2DeleteOk === false) {
        toast.error("Organization was NOT deleted", {
          description:
            "The project database delete failed — nothing was removed. Review the audit report.",
        });
      } else if (report.success && pendingRegistryRows > 0) {
        toast.success("Organization deleted", {
          description: `${pendingRegistryRows} registry table(s) still need manual cleanup — see the audit report.`,
        });
      } else if (report.success) {
        toast.success("Organization deleted", { description: report.slug });
      } else {
        toast.warning("Organization deleted with unresolved issues", {
          description: `${report.errors.length} issue(s) recorded — review the audit report.`,
        });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.organizations() });
      if (report.orgRegistryId) {
        // Mirror invalidateOrganization (useOrganizations) so the detail page
        // never serves the deleted org from cache, plus its org-scoped keys.
        queryClient.invalidateQueries({
          queryKey: queryKeys.organization(report.orgRegistryId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizationFeatures(report.orgRegistryId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizationSubscription(report.orgRegistryId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizationSpecialPlan(report.orgRegistryId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizationInvoices(report.orgRegistryId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizationMembers(report.orgRegistryId),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.orgDeleteAuditReportsRoot() });
    },
    onError: (error: Error) => {
      toast.error("Could not delete organization", { description: error.message });
    },
  });

  return {
    execute: mutation.mutate,
    executeAsync: mutation.mutateAsync,
    isExecuting: mutation.isPending,
    report: mutation.data ?? null,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/** Audit reports saved in localStorage, newest first. */
export function useOrgDeleteAuditReports(slug?: string) {
  const { data = [] } = useQuery<AuditReport[]>({
    queryKey: queryKeys.orgDeleteAuditReports(slug),
    queryFn: () => listAuditReports(slug),
    staleTime: 0,
  });

  return { reports: data };
}

/**
 * Registry-only delete for organizations NOT on shared projects.
 * Only available to full-access admins. Deletes only registry data (organization_registry
 * and related tables), NOT the tenant database.
 */
export function useExecuteRegistryOnlyDelete() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id ?? "");

  const mutation = useMutation<
    AuditReport,
    Error,
    { organization: OrganizationRegistry; confirmSlug: string }
  >({
    mutationFn: ({ organization, confirmSlug }) =>
      executeRegistryOnlyDelete(organization, confirmSlug, userId),
    onSuccess: (report) => {
      saveAuditReport(report);

      const pendingRegistryRows = report.registryCleanup.filter(
        (r) => r.status === "pending-server-side",
      ).length;
      if (report.success && pendingRegistryRows > 0) {
        toast.warning("Organization removed from registry", {
          description: `${pendingRegistryRows} registry table(s) still need manual cleanup — see the audit report.`,
        });
      } else if (report.success) {
        toast.success("Organization removed from registry", { description: report.slug });
      } else {
        toast.warning("Organization removed from registry with issues", {
          description: `${report.errors.length} issue(s) recorded — review the audit report.`,
        });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.organizations() });
      if (report.orgRegistryId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.organization(report.orgRegistryId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.organizationFeatures(report.orgRegistryId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.organizationSubscription(report.orgRegistryId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.organizationSpecialPlan(report.orgRegistryId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.organizationInvoices(report.orgRegistryId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.organizationMembers(report.orgRegistryId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.orgDeleteAuditReportsRoot() });
    },
    onError: (error: Error) => {
      toast.error("Could not remove organization from registry", { description: error.message });
    },
  });

  return {
    execute: mutation.mutate,
    executeAsync: mutation.mutateAsync,
    isExecuting: mutation.isPending,
    report: mutation.data ?? null,
    error: mutation.error,
    reset: mutation.reset,
  };
}
