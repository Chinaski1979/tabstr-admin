import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockGetRegistryClient, mockCreateOrgAdminClient } = vi.hoisted(() => ({
  mockGetRegistryClient: vi.fn(),
  mockCreateOrgAdminClient: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  getRegistryClient: mockGetRegistryClient,
}));

vi.mock("@/services/provisioning/orgAdminClient", () => ({
  createOrgAdminClient: mockCreateOrgAdminClient,
  // Pass-through: capability is driven by env presence in these tests.
  assertServiceRoleKey: vi.fn(),
}));

import { buildDryRunPlan, executeOrgDelete, probeDeleteCapability, verifyExecSql } from "../orgDeleteService";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrganizationRegistry } from "@/types";

const PROJECT_1_URL = "https://jriafwvfwwlduldgdqjf.supabase.co";
const ORG_UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const REGISTRY_ID = "registry-123";

const ORG: OrganizationRegistry = {
  id: REGISTRY_ID,
  organizationSlug: "acme",
  supabaseUrl: PROJECT_1_URL,
  supabaseAnonKey: "anon-key",
  isActive: true,
  isSuspended: false,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

// --- Minimal Supabase client mock ------------------------------------------

interface FromResult {
  data?: unknown;
  error?: { code?: string; message: string } | null;
  count?: number | null;
}

interface FromContext {
  table: string;
  op: "select" | "delete" | "update" | "";
  filters: Record<string, unknown>;
}

function createSupabaseMock(handlers: {
  from?: (ctx: FromContext) => FromResult | undefined;
  rpc?: (name: string, params: { sql?: string }) => FromResult | undefined;
}) {
  const rpcCalls: Array<{ name: string; params: { sql?: string } }> = [];
  const fromCalls: FromContext[] = [];

  const client = {
    rpcCalls,
    fromCalls,
    from(table: string) {
      const ctx: FromContext = { table, op: "", filters: {} };
      fromCalls.push(ctx);
      const resolve = (): FromResult => handlers.from?.(ctx) ?? { data: [], error: null };
      const builder: any = {
        select() {
          if (!ctx.op) ctx.op = "select";
          return builder;
        },
        delete() {
          ctx.op = "delete";
          return builder;
        },
        update() {
          ctx.op = "update";
          return builder;
        },
        eq(column: string, value: unknown) {
          ctx.filters[column] = value;
          return builder;
        },
        in(column: string, value: unknown) {
          ctx.filters[`in:${column}`] = value;
          return builder;
        },
        limit: () => builder,
        order: () => builder,
        maybeSingle() {
          return Promise.resolve(resolve()).then((result) => ({
            data: Array.isArray(result.data) ? (result.data[0] ?? null) : (result.data ?? null),
            error: result.error ?? null,
          }));
        },
        then(onFulfilled: any, onRejected: any) {
          return Promise.resolve(resolve()).then(onFulfilled, onRejected);
        },
      };
      return builder;
    },
    rpc(name: string, params: { sql?: string }) {
      rpcCalls.push({ name, params });
      return Promise.resolve(handlers.rpc?.(name, params) ?? { data: null, error: null });
    },
  };
  return client;
}

/** Default project-DB handlers: org exists, counts and members resolve. */
function projectFromHandler(ctx: FromContext): FromResult {
  if (ctx.table === "organizations" && ctx.op === "select") return { data: [{ id: ORG_UUID }] };
  if (ctx.table === "organization_memberships") {
    if (ctx.filters["in:user_id"]) {
      return { data: [{ user_id: "user-1", organization_id: "other-org" }] };
    }
    // Same result shape serves both the head count and the membership select.
    return { data: [{ user_id: "user-1" }, { user_id: "user-1" }], count: 5 };
  }
  if (ctx.op === "select") return { count: 5, data: null };
  return { data: [], error: null };
}

/** Default registry handlers: org row found, deletes succeed. */
function registryFromHandler(ctx: FromContext): FromResult {
  if (ctx.table === "organization_registry" && ctx.op === "select") {
    return { data: [{ id: REGISTRY_ID }] };
  }
  if (ctx.op === "delete") return { data: [{ id: "deleted-row" }], error: null };
  return { data: [], error: null };
}

function installClients(handlers: {
  project?: Parameters<typeof createSupabaseMock>[0];
  registry?: Parameters<typeof createSupabaseMock>[0];
}) {
  const project = createSupabaseMock(handlers.project ?? { from: projectFromHandler });
  const registry = createSupabaseMock(handlers.registry ?? { from: registryFromHandler });
  mockCreateOrgAdminClient.mockReturnValue(project);
  mockGetRegistryClient.mockReturnValue(registry);
  return { project, registry };
}

beforeEach(() => {
  vi.stubEnv("VITE_SHARED_PROJECT_1_SERVICE_KEY", "test-service-key");
  mockGetRegistryClient.mockReset();
  mockCreateOrgAdminClient.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// --- Tests ------------------------------------------------------------------

describe("executeOrgDelete — guards", () => {
  it("throws when the confirmation slug does not match", async () => {
    await expect(executeOrgDelete(ORG, "acme-typo")).rejects.toThrow(/does not match/i);
    expect(mockGetRegistryClient).not.toHaveBeenCalled();
    expect(mockCreateOrgAdminClient).not.toHaveBeenCalled();
  });

  it("throws when the org is not on a configured shared project", async () => {
    const offProject = { ...ORG, supabaseUrl: "https://unknown.supabase.co" };
    await expect(executeOrgDelete(offProject, "acme")).rejects.toThrow(/configured shared project/i);
    expect(mockCreateOrgAdminClient).not.toHaveBeenCalled();
  });
});

describe("executeOrgDelete — phases", () => {
  it("aborts before Phase 1 when exec_sql is missing, recording the exact reason", async () => {
    const { project } = installClients({
      project: {
        from: projectFromHandler,
        rpc: (_name, params) =>
          params.sql === "select 1"
            ? { data: null, error: { code: "42883", message: "function public.exec_sql does not exist" } }
            : { data: null, error: null },
      },
    });

    const report = await executeOrgDelete(ORG, "acme");

    expect(report.aborted).toBe(true);
    expect(report.abortReason).toBe("crear exec_sql en la DB del proyecto project-1");
    expect(report.success).toBe(false);
    expect(report.execSqlPresent).toBe(false);
    // No Phase 1/2 statements were attempted.
    expect(report.executedSql).toHaveLength(0);
    expect(project.rpcCalls.map((c) => c.params.sql)).not.toContain(
      "DELETE FROM organizations WHERE id = '" + ORG_UUID + "'",
    );
    // Registry cleanup marked skipped with the abort reason.
    expect(report.registryCleanup).toHaveLength(7);
    expect(report.registryCleanup.every((r) => r.status === "skipped")).toBe(true);
    expect(report.registryCleanup[0].reason).toContain("crear exec_sql");
  });

  it("aborts with a distinct reason when exec_sql exists but the role may not call it (42501)", async () => {
    const { project } = installClients({
      project: {
        from: projectFromHandler,
        rpc: (_name, params) =>
          params.sql === "select 1"
            ? {
                data: null,
                error: { code: "42501", message: "permission denied for function exec_sql" },
              }
            : { data: null, error: null },
      },
    });

    const report = await executeOrgDelete(ORG, "acme");

    expect(report.aborted).toBe(true);
    expect(report.abortReason).toBe(
      "permission denied for function exec_sql in the DB of project project-1",
    );
    // The function exists — it is not "missing".
    expect(report.execSqlPresent).toBe(true);
    expect(report.success).toBe(false);
    expect(report.executedSql).toHaveLength(0);
    expect(report.registryCleanup).toHaveLength(7);
    expect(report.registryCleanup.every((r) => r.status === "skipped")).toBe(true);
    expect(report.registryCleanup[0].reason).toContain(
      "permission denied for function exec_sql",
    );
  });

  it("aborts with a transport-error reason (not 'crear exec_sql') when the exec_sql probe throws", async () => {
    const { project, registry } = installClients({
      project: {
        from: projectFromHandler,
        rpc: (_name, params) => {
          if (params.sql === "select 1") throw new Error("Failed to fetch");
          return { data: null, error: null };
        },
      },
    });

    const report = await executeOrgDelete(ORG, "acme");

    expect(report.aborted).toBe(true);
    expect(report.abortReason).toBe(
      "could not verify exec_sql — transport error in the DB of project project-1",
    );
    expect(report.abortReason).not.toContain("crear exec_sql");
    expect(report.success).toBe(false);
    expect(report.phase2DeleteOk).toBe(false);
    expect(report.executedSql).toHaveLength(0);
    expect(project.rpcCalls.map((c) => c.params.sql)).not.toContain(
      "DELETE FROM organizations WHERE id = '" + ORG_UUID + "'",
    );
    expect(registry.fromCalls.filter((c) => c.op === "delete")).toHaveLength(0);
  });

  it("re-enables BOTH triggers in finally when the DELETE throws, keeping the registry entry", async () => {
    const { project, registry } = installClients({
      project: {
        from: projectFromHandler,
        rpc: (_name, params) => {
          if (params.sql?.startsWith("DELETE FROM organizations")) throw new Error("network broke");
          return { data: null, error: null };
        },
      },
    });

    const report = await executeOrgDelete(ORG, "acme");

    const sqls = project.rpcCalls.map((c) => c.params.sql);
    const deleteIndex = sqls.indexOf(`DELETE FROM organizations WHERE id = '${ORG_UUID}'`);
    const tabsEnableIndex = sqls.indexOf(
      "ALTER TABLE tabs ENABLE TRIGGER trg_tab_deletions_history",
    );
    const itemsEnableIndex = sqls.indexOf(
      "ALTER TABLE tab_items ENABLE TRIGGER trg_tab_item_history_changes",
    );

    expect(sqls).toContain("ALTER TABLE tabs DISABLE TRIGGER trg_tab_deletions_history");
    expect(sqls).toContain("ALTER TABLE tab_items DISABLE TRIGGER trg_tab_item_history_changes");
    expect(deleteIndex).toBeGreaterThanOrEqual(0);
    expect(tabsEnableIndex).toBeGreaterThan(deleteIndex);
    expect(itemsEnableIndex).toBeGreaterThan(deleteIndex);

    expect(report.triggersReenabled).toBe(true);
    expect(report.triggerErrors).toHaveLength(0);
    expect(report.errors.some((e) => e.includes("Phase 2 delete failed"))).toBe(true);
    expect(report.success).toBe(false);
    // Phase 3 is SKIPPED — deleting the registry entry while the tenant row
    // remains would make a retry impossible ("org not found").
    expect(report.registryCleanup).toHaveLength(7);
    expect(report.registryCleanup.every((r) => r.status === "skipped")).toBe(true);
    expect(report.registryCleanup[0].reason).toContain("registry entry kept for retry");
    expect(registry.fromCalls.filter((c) => c.op === "delete")).toHaveLength(0);
  });

  it("skips Phase 3 when the Phase 2 DELETE returns an error", async () => {
    const { registry } = installClients({
      project: {
        from: projectFromHandler,
        rpc: (_name, params) =>
          params.sql?.startsWith("DELETE FROM organizations")
            ? { data: null, error: { code: "55006", message: "database is shutting down" } }
            : { data: null, error: null },
      },
    });

    const report = await executeOrgDelete(ORG, "acme");

    expect(report.errors.some((e) => e.includes("Phase 2 delete failed"))).toBe(true);
    expect(report.success).toBe(false);
    // Explicit signal: the org row was NOT deleted — the UI must not say "deleted".
    expect(report.phase2DeleteOk).toBe(false);
    expect(report.registryCleanup.every((r) => r.status === "skipped")).toBe(true);
    expect(report.registryCleanup[0].reason).toContain("registry entry kept for retry");
    expect(registry.fromCalls.filter((c) => c.op === "delete")).toHaveLength(0);
  });

  it("records per-statement Phase 1 failures and continues", async () => {
    const { project } = installClients({
      project: {
        from: projectFromHandler,
        rpc: (_name, params) =>
          params.sql?.startsWith("UPDATE sales SET tab_id")
            ? { data: null, error: { code: "42703", message: "column tab_id does not exist" } }
            : { data: null, error: null },
      },
    });

    const report = await executeOrgDelete(ORG, "acme");

    const failed = report.executedSql.filter((s) => !s.ok);
    expect(failed).toHaveLength(1);
    expect(failed[0].sql).toContain("UPDATE sales SET tab_id");
    expect(report.errors.some((e) => e.includes("Phase 1 failed"))).toBe(true);
    // Later statements still ran.
    expect(report.executedSql.length).toBeGreaterThan(10);
  });

  it("deletes registry children and the org row on the happy path", async () => {
    const { project, registry } = installClients({});

    const report = await executeOrgDelete(ORG, "acme");

    expect(report.aborted).toBe(false);
    expect(report.success).toBe(true);
    expect(report.phase2DeleteOk).toBe(true);
    expect(report.orgRegistryId).toBe(REGISTRY_ID);
    expect(report.orgId).toBe(ORG_UUID);
    expect(report.counts.every((c) => c.count === 5 || c.count === -1)).toBe(true);
    expect(report.orgUsers).toEqual([{ userId: "user-1", inOtherOrgs: true }]);
    // Phase 2 succeeded → Phase 3 ran. Allowed tables are deleted; pending
    // ones are NEVER claimed deleted even when the attempt answers no-error.
    const allowed = report.registryCleanup.filter((r) => r.disposition === "allowed");
    const pending = report.registryCleanup.filter(
      (r) => r.disposition === "pending-server-side",
    );
    expect(allowed).toHaveLength(4);
    expect(allowed.every((r) => r.status === "deleted")).toBe(true);
    expect(pending).toHaveLength(3);
    expect(pending.every((r) => r.status === "pending-server-side")).toBe(true);
    expect(pending.every((r) => !!r.manualSql)).toBe(true);

    // Registry deletes were org-scoped and organization_registry went last.
    const deletes = registry.fromCalls.filter((c) => c.op === "delete");
    expect(deletes[deletes.length - 1].table).toBe("organization_registry");
    expect(deletes[deletes.length - 1].filters["organization_slug"]).toBe("acme");
    expect(project.rpcCalls.some((c) => c.name === "exec_sql")).toBe(true);
  });

  it("marks 42501 registry deletes as pending-server-side and continues to organization_registry", async () => {
    const { registry } = installClients({
      registry: {
        from(ctx: FromContext) {
          if (ctx.table === "organization_registry" && ctx.op === "select") {
            return { data: [{ id: REGISTRY_ID }] };
          }
          if (ctx.op === "delete") {
            if (ctx.table === "subscription_invoices") {
              return {
                data: null,
                error: { code: "42501", message: "permission denied for table subscription_invoices" },
              };
            }
            return { data: [{ id: "row" }], error: null };
          }
          return { data: [], error: null };
        },
      },
    });

    const report = await executeOrgDelete(ORG, "acme");

    const invoices = report.registryCleanup.find((r) => r.table === "subscription_invoices");
    expect(invoices?.status).toBe("pending-server-side");
    expect(invoices?.errorCode).toBe("42501");
    expect(invoices?.error).toContain("permission denied");
    expect(invoices?.manualSql).toContain("DELETE FROM public.subscription_invoices");
    expect(invoices?.manualSql).toContain("REGISTRY_SERVICE_ROLE_KEY");

    // Flow continued to organization_registry.
    const registryDeletes = registry.fromCalls.filter(
      (c) => c.table === "organization_registry" && c.op === "delete",
    );
    expect(registryDeletes).toHaveLength(1);
    const orgRow = report.registryCleanup.find((r) => r.table === "organization_registry");
    expect(orgRow?.status).toBe("deleted");
    expect(report.success).toBe(true);
  });

  it("records missing registry tables as pending and tolerates their absence", async () => {
    installClients({
      registry: {
        from(ctx: FromContext) {
          if (ctx.table === "organization_registry" && ctx.op === "select") {
            return { data: [{ id: REGISTRY_ID }] };
          }
          if (ctx.op === "delete") {
            if (ctx.table === "powertranz_logs") {
              return { data: null, error: { code: "PGRST205", message: "Could not find the table 'public.powertranz_logs' in the schema cache" } };
            }
            return { data: [{ id: "row" }], error: null };
          }
          return { data: [], error: null };
        },
      },
    });

    const report = await executeOrgDelete(ORG, "acme");
    const logs = report.registryCleanup.find((r) => r.table === "powertranz_logs");
    expect(logs?.status).toBe("pending-server-side");
    expect(logs?.reason).toMatch(/schema cache/i);
    expect(logs?.manualSql).toContain("powertranz_logs");
  });

  it("keeps a thrown permission-denied error on a pending table as pending-server-side", async () => {
    installClients({
      registry: {
        from(ctx: FromContext) {
          if (ctx.table === "organization_registry" && ctx.op === "select") {
            return { data: [{ id: REGISTRY_ID }] };
          }
          if (ctx.op === "delete" && ctx.table === "subscription_invoices") {
            throw new Error("permission denied for table subscription_invoices");
          }
          if (ctx.op === "delete") return { data: [{ id: "row" }], error: null };
          return { data: [], error: null };
        },
      },
    });

    const report = await executeOrgDelete(ORG, "acme");
    const invoices = report.registryCleanup.find((r) => r.table === "subscription_invoices");
    expect(invoices?.status).toBe("pending-server-side");
    expect(invoices?.reason).toMatch(/manual SQL/i);
    expect(invoices?.error).toContain("permission denied");
    expect(invoices?.manualSql).toContain("subscription_invoices");
  });

  it("marks any other thrown error on a pending table as failed with the raw error", async () => {
    installClients({
      registry: {
        from(ctx: FromContext) {
          if (ctx.table === "organization_registry" && ctx.op === "select") {
            return { data: [{ id: REGISTRY_ID }] };
          }
          if (ctx.op === "delete" && ctx.table === "powertranz_logs") {
            throw new Error("Failed to fetch");
          }
          if (ctx.op === "delete") return { data: [{ id: "row" }], error: null };
          return { data: [], error: null };
        },
      },
    });

    const report = await executeOrgDelete(ORG, "acme");
    const logs = report.registryCleanup.find((r) => r.table === "powertranz_logs");
    expect(logs?.status).toBe("failed");
    expect(logs?.error).toBe("Failed to fetch");
    expect(logs?.reason).toContain("Failed to fetch");
    expect(logs?.reason).not.toMatch(/manual cleanup required/i);
    expect(report.success).toBe(false);
  });

  it("retries organization_registry deletes on 23503 and reports the exact error", async () => {
    let registryDeleteAttempts = 0;
    installClients({
      registry: {
        from(ctx: FromContext) {
          if (ctx.table === "organization_registry" && ctx.op === "select") {
            return { data: [{ id: REGISTRY_ID }] };
          }
          if (ctx.op === "delete") {
            if (ctx.table === "organization_registry") {
              registryDeleteAttempts += 1;
              return {
                data: null,
                error: { code: "23503", message: "update or delete on table organization_registry violates foreign key" },
              };
            }
            return { data: [{ id: "row" }], error: null };
          }
          return { data: [], error: null };
        },
      },
    });

    const report = await executeOrgDelete(ORG, "acme");

    expect(registryDeleteAttempts).toBe(2); // initial + reverse-order retry
    const orgRow = report.registryCleanup.find((r) => r.table === "organization_registry");
    expect(orgRow?.status).toBe("failed");
    expect(orgRow?.errorCode).toBe("23503");
    expect(orgRow?.error).toContain("violates foreign key");
    expect(report.success).toBe(false);
  });

  it("aborts with a report when the org row is missing in the project DB", async () => {
    installClients({
      project: {
        from(ctx: FromContext) {
          if (ctx.table === "organizations" && ctx.op === "select") return { data: null };
          return projectFromHandler(ctx);
        },
      },
    });

    const report = await executeOrgDelete(ORG, "acme");
    expect(report.aborted).toBe(true);
    expect(report.abortReason).toContain(`Organization "acme" not found in the project database`);
    expect(report.executedSql).toHaveLength(0);
  });
});

describe("probeDeleteCapability", () => {
  it("skips the live probe when local capability is disabled", async () => {
    vi.stubEnv("VITE_SHARED_PROJECT_1_SERVICE_KEY", "");
    const probe = await probeDeleteCapability(ORG);
    expect(probe.enabled).toBe(false);
    expect(probe.liveProbe).toBe("skipped");
    expect(mockCreateOrgAdminClient).not.toHaveBeenCalled();
  });

  it("enables when the live probe finds the org row", async () => {
    installClients({});
    const probe = await probeDeleteCapability(ORG);
    expect(probe.enabled).toBe(true);
    expect(probe.liveProbe).toBe("ok");
  });

  it("disables with a reason when the org row is missing in the project DB", async () => {
    installClients({
      project: {
        from(ctx: FromContext) {
          if (ctx.table === "organizations" && ctx.op === "select") return { data: [] };
          return { data: [], error: null };
        },
      },
    });
    const probe = await probeDeleteCapability(ORG);
    expect(probe.enabled).toBe(false);
    expect(probe.liveProbe).toBe("failed");
    expect(probe.reason).toContain(`Organization "acme" not found in the project database`);
  });

  it("disables with a reason when the probe errors", async () => {
    installClients({
      project: {
        from: () => ({ data: null, error: { message: "Invalid API key" } }),
      },
    });
    const probe = await probeDeleteCapability(ORG);
    expect(probe.enabled).toBe(false);
    expect(probe.reason).toContain("Live probe failed");
    expect(probe.probeError).toBe("Invalid API key");
  });
});

describe("verifyExecSql", () => {
  const asClient = (client: ReturnType<typeof createSupabaseMock>) =>
    client as unknown as SupabaseClient;

  it("returns present when the probe succeeds", async () => {
    await expect(verifyExecSql(asClient(createSupabaseMock({})))).resolves.toBe("present");
  });

  it("returns missing only for function-does-not-exist answers", async () => {
    const missingErrors = [
      { code: "42883", message: "function public.exec_sql does not exist" },
      { code: "PGRST202", message: "Could not find the function public.exec_sql in the schema cache" },
      { message: "Could not find the function exec_sql" },
    ];
    for (const error of missingErrors) {
      const client = createSupabaseMock({ rpc: () => ({ data: null, error }) });
      await expect(verifyExecSql(asClient(client))).resolves.toBe("missing");
    }
  });

  it("returns permission-denied for 42501 — the function exists", async () => {
    const client = createSupabaseMock({
      rpc: () => ({
        data: null,
        error: { code: "42501", message: "permission denied for function exec_sql" },
      }),
    });
    await expect(verifyExecSql(asClient(client))).resolves.toBe("permission-denied");
  });

  it("returns unverified (not missing) when the probe itself throws", async () => {
    const client = createSupabaseMock({
      rpc: () => {
        throw new Error("Failed to fetch");
      },
    });
    await expect(verifyExecSql(asClient(client))).resolves.toBe("unverified");
  });
});

describe("buildDryRunPlan — read-only guarantee", () => {
  it("issues no delete/update calls and no rpc SQL other than the select 1 probe", async () => {
    const { project, registry } = installClients({});

    const plan = await buildDryRunPlan(ORG);

    expect(plan.orgId).toBe(ORG_UUID);
    expect(plan.orgRegistryId).toBe(REGISTRY_ID);
    expect(plan.execSqlPresent).toBe(true);
    expect(plan.sqlStatements.length).toBeGreaterThan(0);

    // Project DB: only reads (org lookup, counts, members).
    expect(project.fromCalls.length).toBeGreaterThan(0);
    expect(project.fromCalls.every((c) => c.op === "select")).toBe(true);
    // Registry: only the organization_registry lookup.
    expect(registry.fromCalls.every((c) => c.op === "select")).toBe(true);
    // The only SQL sent through exec_sql is the read-only probe.
    expect(project.rpcCalls.map((c) => c.params.sql)).toEqual(["select 1"]);
  });
});
