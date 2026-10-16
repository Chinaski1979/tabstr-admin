import type { SupabaseClient } from "@supabase/supabase-js";

import { getRegistryClient } from "@/integrations/supabase/client";
import { assertServiceRoleKey, createOrgAdminClient } from "@/services/provisioning/orgAdminClient";
import { findSharedProjectByUrl } from "@/config/sharedSupabaseProjects";
import {
  ORG_SCOPED_TABLES,
  PHASE2_DISABLE_STATEMENTS,
  PHASE2_ENABLE_STATEMENTS,
  REGISTRY_TABLES,
  buildAllStatements,
  buildPhase1Statements,
  buildPhase2DeleteStatement,
  buildRegistryManualSql,
  isSkippedTable,
} from "./orgDeleteTables";
import type {
  DryRunPlan,
  ExecutedSqlStatement,
  OrgDeleteCapability,
  OrgDeleteCapabilityProbe,
  OrgDeleteOrgUser,
  AuditReport,
  OrganizationRegistry,
  RegistryCleanupResult,
  RegistryTableDescriptor,
  TableCount,
} from "@/types";

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Reads a `VITE_SHARED_PROJECT_{n}_SERVICE_KEY` from the build env (never logged). */
function readServiceKey(envVar?: string): string | undefined {
  if (!envVar) return undefined;
  const value = (import.meta.env as Record<string, string | undefined>)[envVar];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

// ---------------------------------------------------------------------------
// Capability
// ---------------------------------------------------------------------------

/**
 * Local (no network) capability check: the org must live on a configured shared
 * project and its service role key env var must hold a valid service_role JWT.
 */
export function checkDeleteCapability(
  org: Pick<OrganizationRegistry, "supabaseUrl">,
): OrgDeleteCapability {
  const project = findSharedProjectByUrl(org.supabaseUrl);
  if (!project) {
    return { enabled: false, reason: "This organization is not on a configured shared project" };
  }

  const { id: projectId, serviceKeyEnvVar: envVar } = project;
  const serviceKey = readServiceKey(envVar);
  if (!serviceKey) {
    return { enabled: false, reason: `Missing ${envVar} for this project`, projectId, envVar };
  }

  try {
    assertServiceRoleKey(serviceKey);
  } catch (error) {
    return {
      enabled: false,
      reason: toMessage(error),
      projectId,
      envVar,
    };
  }

  return { enabled: true, projectId, envVar };
}

/**
 * Capability + one live read against the org's project DB with the service
 * client. Any failure (bad key, unreachable project, missing org row) disables
 * deletion with a concrete reason.
 */
export async function probeDeleteCapability(
  org: OrganizationRegistry,
): Promise<OrgDeleteCapabilityProbe> {
  const capability = checkDeleteCapability(org);
  if (!capability.enabled) return { ...capability, liveProbe: "skipped" };

  const serviceKey = readServiceKey(capability.envVar);
  if (!serviceKey) {
    return {
      ...capability,
      enabled: false,
      reason: `Missing ${capability.envVar} for this project`,
      liveProbe: "skipped",
    };
  }

  try {
    const client = createOrgAdminClient(org.supabaseUrl, serviceKey);
    const { data, error } = await client
      .from("organizations")
      .select("id")
      .eq("slug", org.organizationSlug)
      .limit(1);

    if (error) {
      return {
        ...capability,
        enabled: false,
        reason: `Live probe failed: ${error.message}`,
        liveProbe: "failed",
        probeError: error.message,
      };
    }
    if (!data || data.length === 0) {
      const reason = `Organization "${org.organizationSlug}" not found in the project database`;
      return { ...capability, enabled: false, reason, liveProbe: "failed", probeError: reason };
    }
    return { ...capability, liveProbe: "ok" };
  } catch (error) {
    const message = toMessage(error);
    return {
      ...capability,
      enabled: false,
      reason: `Live probe failed: ${message}`,
      liveProbe: "failed",
      probeError: message,
    };
  }
}

/** Result of the read-only `select 1` probe against `exec_sql`. */
export type ExecSqlState = "present" | "missing" | "permission-denied" | "unverified";

/**
 * Probes `exec_sql`:
 *  - `missing`: only Postgres 42883 / PostgREST PGRST202 / "does not exist" /
 *    "Could not find the function" mean the function is absent.
 *  - `permission-denied`: 42501 — the function EXISTS but this role may not
 *    call it; aborting needs a distinct reason, not "create exec_sql".
 *  - `unverified`: the probe itself threw (transport/JS error) — nothing is
 *    known about the function, so it must NOT be reported as missing.
 *  - `present`: anything else means the function exists and ran (its own
 *    failures surface later, per statement).
 */
export async function verifyExecSql(client: SupabaseClient): Promise<ExecSqlState> {
  try {
    const { error } = await client.rpc("exec_sql", { sql: "select 1" });
    if (!error) return "present";
    const code = (error as { code?: string }).code ?? "";
    const message = error.message ?? "";
    if (code === "42501" || /permission denied/i.test(message)) return "permission-denied";
    if (
      code === "42883" ||
      code === "PGRST202" ||
      /does not exist/i.test(message) ||
      message.includes("Could not find the function")
    ) {
      return "missing";
    }
    return "present";
  } catch {
    // Cannot verify → do not proceed with destructive SQL, but do not claim
    // the function is missing either.
    return "unverified";
  }
}

// ---------------------------------------------------------------------------
// Phase 0 — read-only collection (shared by dry-run and execution)
// ---------------------------------------------------------------------------

interface RegistryOrgLookup {
  orgRegistryId: string;
  error?: string;
}

async function fetchRegistryOrg(slug: string): Promise<RegistryOrgLookup> {
  try {
    const { data, error } = await getRegistryClient()
      .from("organization_registry")
      .select("id")
      .eq("organization_slug", slug)
      .maybeSingle();

    if (error) {
      return { orgRegistryId: "", error: `Registry lookup failed: ${error.message}` };
    }
    if (!data) {
      return {
        orgRegistryId: "",
        error: `Organization "${slug}" not found in organization_registry`,
      };
    }
    return { orgRegistryId: data.id as string };
  } catch (error) {
    return { orgRegistryId: "", error: `Registry lookup failed: ${toMessage(error)}` };
  }
}

async function resolveProjectOrgId(
  client: SupabaseClient,
  slug: string,
): Promise<{ orgId: string; error?: string }> {
  try {
    const { data, error } = await client
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (error) {
      return { orgId: "", error: `Could not resolve organization in project database: ${error.message}` };
    }
    if (!data) {
      return { orgId: "", error: `Organization "${slug}" not found in the project database` };
    }
    return { orgId: data.id as string };
  } catch (error) {
    return { orgId: "", error: `Could not resolve organization in project database: ${toMessage(error)}` };
  }
}

async function collectCounts(
  client: SupabaseClient,
  orgId: string,
): Promise<{ counts: TableCount[]; errors: string[] }> {
  const counts: TableCount[] = [];
  const errors: string[] = [];

  for (const table of ORG_SCOPED_TABLES) {
    if (isSkippedTable(table)) {
      counts.push({ table, count: -1, skipped: true });
      continue;
    }
    try {
      const { count, error } = await client
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId);
      if (error) {
        counts.push({ table, count: -1, skipped: false });
        errors.push(`Count failed for ${table}: ${error.message}`);
      } else {
        counts.push({ table, count: count ?? 0, skipped: false });
      }
    } catch (error) {
      counts.push({ table, count: -1, skipped: false });
      errors.push(`Count failed for ${table}: ${toMessage(error)}`);
    }
  }

  return { counts, errors };
}

async function collectOrgUsers(
  client: SupabaseClient,
  orgId: string,
): Promise<{ orgUserIds: string[]; orgUsers: OrgDeleteOrgUser[]; errors: string[] }> {
  try {
    const { data, error } = await client
      .from("organization_memberships")
      .select("user_id")
      .eq("organization_id", orgId);
    if (error) {
      return { orgUserIds: [], orgUsers: [], errors: [`Could not read organization_memberships: ${error.message}`] };
    }

    const orgUserIds = [...new Set((data ?? []).map((row: { user_id?: string }) => row.user_id).filter(Boolean))] as string[];
    if (orgUserIds.length === 0) return { orgUserIds: [], orgUsers: [], errors: [] };

    const { data: memberships, error: membershipError } = await client
      .from("organization_memberships")
      .select("user_id, organization_id")
      .in("user_id", orgUserIds);
    if (membershipError) {
      return {
        orgUserIds,
        orgUsers: orgUserIds.map((userId) => ({ userId, inOtherOrgs: false })),
        errors: [`Could not read cross-organization memberships: ${membershipError.message}`],
      };
    }

    const rows = (memberships ?? []) as { user_id: string; organization_id: string }[];
    const orgUsers = orgUserIds.map((userId) => ({
      userId,
      inOtherOrgs: rows.some((row) => row.user_id === userId && row.organization_id !== orgId),
    }));
    return { orgUserIds, orgUsers, errors: [] };
  } catch (error) {
    return { orgUserIds: [], orgUsers: [], errors: [`Could not read organization members: ${toMessage(error)}`] };
  }
}

// ---------------------------------------------------------------------------
// Dry run
// ---------------------------------------------------------------------------

/**
 * Read-only preview of the deletion: counts, org members, generated SQL and the
 * registry plan. Touches no data (counts + selects only).
 */
export async function buildDryRunPlan(org: OrganizationRegistry): Promise<DryRunPlan> {
  const capability = checkDeleteCapability(org);
  if (!capability.enabled || !capability.projectId) {
    throw new Error(capability.reason ?? "Deletion is not available for this organization");
  }
  const serviceKey = readServiceKey(capability.envVar);
  if (!serviceKey) throw new Error(`Missing ${capability.envVar} for this project`);

  const errors: string[] = [];
  const registry = await fetchRegistryOrg(org.organizationSlug);
  if (registry.error) errors.push(registry.error);

  const client = createOrgAdminClient(org.supabaseUrl, serviceKey);
  const execSqlState = await verifyExecSql(client);
  const execSqlPresent = execSqlState !== "missing";
  if (execSqlState === "permission-denied") {
    errors.push(`permission denied for function exec_sql in the DB of project ${capability.projectId}`);
  }

  const orgLookup = await resolveProjectOrgId(client, org.organizationSlug);
  if (orgLookup.error) errors.push(orgLookup.error);

  let counts: TableCount[] = [];
  let orgUserIds: string[] = [];
  let orgUsers: OrgDeleteOrgUser[] = [];
  if (orgLookup.orgId) {
    const counted = await collectCounts(client, orgLookup.orgId);
    counts = counted.counts;
    errors.push(...counted.errors);

    const members = await collectOrgUsers(client, orgLookup.orgId);
    orgUserIds = members.orgUserIds;
    orgUsers = members.orgUsers;
    errors.push(...members.errors);
  }

  return {
    slug: org.organizationSlug,
    orgRegistryId: registry.orgRegistryId,
    orgId: orgLookup.orgId,
    projectId: capability.projectId,
    execSqlPresent,
    counts,
    orgUserIds,
    orgUsers,
    sqlStatements: orgLookup.orgId ? buildAllStatements(orgLookup.orgId) : [],
    registryPlan: [...REGISTRY_TABLES],
    errors,
  };
}

// ---------------------------------------------------------------------------
// Phase 3 — registry cleanup
// ---------------------------------------------------------------------------

function pendingReason(errorCode: string | undefined, message: string): string {
  if (errorCode === "42501" || /permission denied/i.test(message)) {
    return "Registry RLS denies admin deletes (select-only policy/grant) — run the manual SQL with the server-side service role key.";
  }
  if (errorCode === "PGRST205" || errorCode === "42P01" || /could not find the table|does not exist/i.test(message)) {
    return "Table not present in the registry schema cache — confirm it exists, then delete manually.";
  }
  return `Registry delete not permitted (${errorCode ?? "error"}) — manual cleanup required.`;
}

function allowedReason(errorCode: string | undefined): string {
  if (errorCode === "42501") return "Registry RLS denied the delete (42501).";
  if (errorCode === "23503") return "Blocked by a foreign key (23503).";
  return "Registry delete failed.";
}

/**
 * True only for the two answers that prove a `pending-server-side` case:
 * 42501 (permission denied) or a missing table. Anything else (network,
 * timeout, …) is an ordinary failure, not "manual cleanup required".
 */
function isPendingServerError(errorCode: string | undefined, message: string): boolean {
  return (
    errorCode === "42501" ||
    errorCode === "PGRST205" ||
    errorCode === "42P01" ||
    /permission denied/i.test(message) ||
    /could not find the table|does not exist/i.test(message)
  );
}

async function attemptRegistryDelete(
  client: SupabaseClient,
  descriptor: RegistryTableDescriptor,
  slug: string,
  orgRegistryId: string,
): Promise<RegistryCleanupResult> {
  if (!orgRegistryId) {
    return {
      ...descriptor,
      status: "skipped",
      rowCount: null,
      reason: "No registry organization id resolved — skipped.",
      manualSql: buildRegistryManualSql(descriptor, orgRegistryId),
    };
  }

  try {
    const value = descriptor.fkColumn === "organization_slug" ? slug : orgRegistryId;
    const { data, error } = await client
      .from(descriptor.table)
      .delete()
      .select("id")
      .eq(descriptor.fkColumn ?? "organization_id", value);

    if (!error) {
      const rowCount = Array.isArray(data) ? data.length : null;
      if (descriptor.disposition === "pending-server-side") {
        // Never report `deleted`: the browser session may lack DELETE rights
        // (RLS is proved by an explicit 42501) and the filter may not match
        // the right FK value. The attempt is kept only to capture the proof.
        return {
          ...descriptor,
          status: "pending-server-side",
          rowCount: null,
          reason:
            "No error reported — still treated as pending server-side; run the manual SQL to confirm.",
          manualSql: buildRegistryManualSql(descriptor, orgRegistryId),
        };
      }
      return { ...descriptor, status: "deleted", rowCount };
    }

    const errorCode = (error as { code?: string }).code;
    const message = error.message ?? "Unknown error";
    if (descriptor.disposition === "pending-server-side") {
      return {
        ...descriptor,
        status: "pending-server-side",
        rowCount: null,
        reason: pendingReason(errorCode, message),
        manualSql: buildRegistryManualSql(descriptor, orgRegistryId),
        error: message,
        errorCode,
      };
    }
    return {
      ...descriptor,
      status: "failed",
      rowCount: null,
      reason: allowedReason(errorCode),
      error: message,
      errorCode,
    };
  } catch (error) {
    const message = toMessage(error);
    if (descriptor.disposition === "pending-server-side") {
      // Only 42501 / missing-table prove the manual-cleanup case; every other
      // thrown error (network, timeout, …) is a plain failure with the raw error.
      if (isPendingServerError(undefined, message)) {
        return {
          ...descriptor,
          status: "pending-server-side",
          rowCount: null,
          reason: pendingReason(undefined, message),
          manualSql: buildRegistryManualSql(descriptor, orgRegistryId),
          error: message,
        };
      }
      return {
        ...descriptor,
        status: "failed",
        rowCount: null,
        reason: `Delete attempt failed: ${message}`,
        error: message,
      };
    }
    return { ...descriptor, status: "failed", rowCount: null, reason: "Delete attempt failed.", error: message };
  }
}

async function runRegistryCleanup(
  org: OrganizationRegistry,
  orgRegistryId: string,
): Promise<RegistryCleanupResult[]> {
  const client = getRegistryClient();
  const results: RegistryCleanupResult[] = [];

  // Children first; organization_registry last.
  for (const descriptor of REGISTRY_TABLES) {
    results.push(await attemptRegistryDelete(client, descriptor, org.organizationSlug, orgRegistryId));
  }

  // FK violation → retry the failed deletes in reverse order, then report the exact error.
  const fkFailures = results.filter((r) => r.status === "failed" && r.errorCode === "23503");
  if (fkFailures.length > 0) {
    const failedTables = new Set(fkFailures.map((r) => r.table));
    const retryOrder = [...REGISTRY_TABLES].reverse().filter((d) => failedTables.has(d.table));
    for (const descriptor of retryOrder) {
      const index = results.findIndex((r) => r.table === descriptor.table);
      results[index] = await attemptRegistryDelete(client, descriptor, org.organizationSlug, orgRegistryId);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

/**
 * Recursive organization delete. ALWAYS resolves with an AuditReport — even for
 * partial failures — and throws only for capability/guard failures.
 */
export async function executeOrgDelete(
  org: OrganizationRegistry,
  confirmSlug: string,
): Promise<AuditReport> {
  if (confirmSlug !== org.organizationSlug) {
    throw new Error("Confirmation slug does not match this organization");
  }

  const capability = checkDeleteCapability(org);
  if (!capability.enabled || !capability.projectId) {
    throw new Error(capability.reason ?? "Deletion is not available for this organization");
  }
  const serviceKey = readServiceKey(capability.envVar);
  if (!serviceKey) throw new Error(`Missing ${capability.envVar} for this project`);

  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const slug = org.organizationSlug;
  const errors: string[] = [];

  // --- Phase 0: read-only collection -------------------------------------
  const registry = await fetchRegistryOrg(slug);
  if (registry.error) errors.push(registry.error);

  const client = createOrgAdminClient(org.supabaseUrl, serviceKey);
  const execSqlState = await verifyExecSql(client);
  const execSqlPresent = execSqlState !== "missing";

  const orgLookup = await resolveProjectOrgId(client, slug);
  if (orgLookup.error) errors.push(orgLookup.error);
  const orgId = orgLookup.orgId;

  let counts: TableCount[] = [];
  let orgUsers: OrgDeleteOrgUser[] = [];
  if (orgId) {
    const counted = await collectCounts(client, orgId);
    counts = counted.counts;
    errors.push(...counted.errors);

    const members = await collectOrgUsers(client, orgId);
    orgUsers = members.orgUsers;
    errors.push(...members.errors);
  }

  const executedSql: ExecutedSqlStatement[] = [];
  let triggersReenabled = true;
  const triggerErrors: string[] = [];
  let registryCleanup: RegistryCleanupResult[] = [];
  // Declared before finishReport so every report (aborted included) states
  // explicitly whether the Phase 2 DELETE actually removed the org row.
  let phase2DeleteOk = false;

  const finishReport = (aborted: boolean, abortReason: string | null): AuditReport => {
    const finishedAtMs = Date.now();
    const hasFailedRegistryRow = registryCleanup.some((r) => r.status === "failed");
    return {
      id: `${slug}-${finishedAtMs}-${Math.random().toString(36).slice(2, 8)}`,
      slug,
      orgRegistryId: registry.orgRegistryId,
      orgId,
      projectId: capability.projectId as string,
      startedAt,
      finishedAt: new Date(finishedAtMs).toISOString(),
      durationMs: finishedAtMs - startedAtMs,
      aborted,
      abortReason,
      success:
        !aborted &&
        errors.length === 0 &&
        triggersReenabled &&
        !hasFailedRegistryRow,
      phase2DeleteOk,
      execSqlPresent,
      counts,
      orgUsers,
      executedSql,
      triggersReenabled,
      triggerErrors,
      registryCleanup,
      errors,
    };
  };

  // --- Abort conditions (still return a report) ---------------------------
  let abortReason: string | null = null;
  if (!registry.orgRegistryId) {
    abortReason = registry.error ?? `Organization "${slug}" not found in organization_registry`;
  } else if (!orgId) {
    abortReason = orgLookup.error ?? `Organization "${slug}" not found in the project database`;
  } else if (execSqlState === "missing") {
    abortReason = `crear exec_sql en la DB del proyecto ${capability.projectId}`;
  } else if (execSqlState === "unverified") {
    abortReason = `could not verify exec_sql — transport error in the DB of project ${capability.projectId}`;
  } else if (execSqlState === "permission-denied") {
    abortReason = `permission denied for function exec_sql in the DB of project ${capability.projectId}`;
  }

  if (abortReason) {
    registryCleanup = REGISTRY_TABLES.map((descriptor) => ({
      ...descriptor,
      status: "skipped" as const,
      rowCount: null,
      reason: `Not attempted — ${abortReason}`,
    }));
    return finishReport(true, abortReason);
  }

  const runExecSql = async (sql: string): Promise<string | null> => {
    try {
      const { error } = await client.rpc("exec_sql", { sql });
      executedSql.push({ sql, ok: !error, error: error?.message });
      return error?.message ?? null;
    } catch (error) {
      const message = toMessage(error);
      executedSql.push({ sql, ok: false, error: message });
      return message;
    }
  };

  // --- Phase 1: break blocking FKs (continue where safe) -----------------
  for (const sql of buildPhase1Statements(orgId)) {
    const message = await runExecSql(sql);
    if (message) errors.push(`Phase 1 failed: ${message}`);
  }

  // --- Phase 2: disable triggers → delete org → ALWAYS re-enable ----------
  try {
    for (const sql of PHASE2_DISABLE_STATEMENTS) {
      const message = await runExecSql(sql);
      if (message) errors.push(`Phase 2 disable trigger failed: ${message}`);
    }
    const deleteMessage = await runExecSql(buildPhase2DeleteStatement(orgId));
    if (deleteMessage) errors.push(`Phase 2 delete failed: ${deleteMessage}`);
    else phase2DeleteOk = true;
  } catch (error) {
    errors.push(`Phase 2 failed: ${toMessage(error)}`);
  } finally {
    // Re-enable each trigger individually — one failure must not skip the other.
    for (const sql of PHASE2_ENABLE_STATEMENTS) {
      try {
        const message = await runExecSql(sql);
        if (message) {
          triggerErrors.push(`${sql}: ${message}`);
          triggersReenabled = false;
        }
      } catch (error) {
        triggerErrors.push(`${sql}: ${toMessage(error)}`);
        triggersReenabled = false;
      }
    }
  }

  // --- Phase 3: registry rows --------------------------------------------
  // ONLY after the tenant row is gone: deleting the registry entry while the
  // project DB delete failed would strand the tenant data and make a retry
  // impossible ("org not found"). Pending-table failures do NOT abort this.
  if (!phase2DeleteOk) {
    registryCleanup = REGISTRY_TABLES.map((descriptor) => ({
      ...descriptor,
      status: "skipped" as const,
      rowCount: null,
      reason: "project DB delete failed — registry entry kept for retry",
    }));
  } else {
    try {
      registryCleanup = await runRegistryCleanup(org, registry.orgRegistryId);
    } catch (error) {
      const message = toMessage(error);
      errors.push(`Phase 3 failed: ${message}`);
      registryCleanup = REGISTRY_TABLES.map((descriptor) => ({
        ...descriptor,
        status: "skipped" as const,
        rowCount: null,
        reason: `Not attempted — ${message}`,
      }));
    }
  }

  return finishReport(false, null);
}
