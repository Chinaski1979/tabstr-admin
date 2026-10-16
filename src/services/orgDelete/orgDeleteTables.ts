import type { RegistryTableDescriptor } from "@/types";

/**
 * Pure data + SQL builders for the recursive organization delete.
 * Nothing here touches the network — every statement is scoped to one orgId.
 *
 * Deletion model (see orgDeleteService.ts):
 *  - Phase 1 breaks the FKs that would block `DELETE FROM organizations`
 *    (auth.users references and cross-table references).
 *  - Phase 2 disables history triggers, deletes the `organizations` row and
 *    lets `ON DELETE CASCADE` remove the org-scoped tenant rows.
 *  - Phase 3 cleans up the registry rows (separate database).
 */

/** All org-scoped tenant tables (32). Counts filter on `organization_id = orgId`. */
export const ORG_SCOPED_TABLES: readonly string[] = [
  "tabs",
  "tab_items",
  "tab_item_promotion_components",
  "products",
  "product_categories",
  "ingredients",
  "sales",
  "cash_balances",
  "cash_withdrawals",
  "shift_closures",
  "organization_memberships",
  "organization_tables",
  "organization_rooms",
  "providers",
  "payment_methods",
  "simple_users",
  "accepted_orders_history",
  "organization_invitations",
  "product_promotions",
  "product_promotion_groups",
  "product_promotion_options",
  "kitchen_tickets",
  "kitchen_ticket_items",
  "clients",
  "provider_orders",
  "organization_messages",
  "product_modifiers",
  "product_ingredients",
  "dispatch_reprints",
  "discount_application_history",
  "tab_item_deletions_history",
  "tab_deletions_history",
];

/**
 * Tables WITHOUT an `organization_id` column: no head-count is possible.
 * They are listed with `count: -1` in reports and cleaned up by SQL (Phase 1/2).
 */
export const SKIP_TABLES: readonly string[] = [
  "tab_item_promotion_components",
  "product_promotion_groups",
  "product_promotion_options",
  "kitchen_ticket_items",
];

export function isSkippedTable(table: string): boolean {
  return SKIP_TABLES.includes(table);
}

/** Escapes a value for use inside a single-quoted SQL literal. */
export function quoteSql(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Phase 1 — statements that must run BEFORE `DELETE FROM organizations`.
 * All are scoped to the organization being deleted.
 */
export function buildPhase1Statements(orgId: string): string[] {
  const org = quoteSql(orgId);
  return [
    // Child of tab_items (no organization_id column of its own).
    `DELETE FROM tab_item_promotion_components WHERE tab_item_id IN (SELECT id FROM tab_items WHERE organization_id = ${org})`,
    // organization_rooms rows are referenced by organization_tables.
    `UPDATE organization_tables SET room_id = NULL WHERE organization_id = ${org}`,
    // FKs to auth.users — nullify so the org's auth users can be removed later.
    `UPDATE tabs SET created_by = NULL WHERE organization_id = ${org} AND created_by IS NOT NULL`,
    `UPDATE sales SET sold_by = NULL WHERE organization_id = ${org} AND sold_by IS NOT NULL`,
    `UPDATE cash_balances SET balanced_by = NULL WHERE organization_id = ${org} AND balanced_by IS NOT NULL`,
    `UPDATE cash_withdrawals SET withdrawn_by = NULL WHERE organization_id = ${org} AND withdrawn_by IS NOT NULL`,
    `UPDATE shift_closures SET closed_by = NULL WHERE organization_id = ${org} AND closed_by IS NOT NULL`,
    `UPDATE accepted_orders_history SET order_imported_by = NULL WHERE organization_id = ${org} AND order_imported_by IS NOT NULL`,
    // FKs to other tenant tables — break them so the cascade can remove providers/payment_methods/tabs.
    `UPDATE ingredients SET provider_id = NULL WHERE organization_id = ${org} AND provider_id IS NOT NULL`,
    `UPDATE sales SET payment_method_id = NULL WHERE organization_id = ${org} AND payment_method_id IS NOT NULL`,
    `UPDATE sales SET tab_id = NULL WHERE organization_id = ${org} AND tab_id IS NOT NULL`,
  ];
}

/** History triggers that must stay quiet while the cascade removes rows. */
export const PHASE2_DISABLE_STATEMENTS: readonly string[] = [
  "ALTER TABLE tabs DISABLE TRIGGER trg_tab_deletions_history",
  "ALTER TABLE tab_items DISABLE TRIGGER trg_tab_item_history_changes",
];

export const PHASE2_ENABLE_STATEMENTS: readonly string[] = [
  "ALTER TABLE tabs ENABLE TRIGGER trg_tab_deletions_history",
  "ALTER TABLE tab_items ENABLE TRIGGER trg_tab_item_history_changes",
];

export function buildPhase2DeleteStatement(orgId: string): string {
  return `DELETE FROM organizations WHERE id = ${quoteSql(orgId)}`;
}

/** Phase 2 in execution order: disable triggers → delete org → (re-enable runs in `finally`). */
export function buildPhase2Statements(orgId: string): string[] {
  return [
    ...PHASE2_DISABLE_STATEMENTS,
    buildPhase2DeleteStatement(orgId),
    ...PHASE2_ENABLE_STATEMENTS,
  ];
}

/** Every statement a deletion would run (Phase 1 + Phase 2), for dry-run display. */
export function buildAllStatements(orgId: string): string[] {
  return [...buildPhase1Statements(orgId), ...buildPhase2Statements(orgId)];
}

/**
 * Phase 3 — registry tables to clean up, children first, `organization_registry` last.
 *
 * Dispositions come from `supabase/admin_setup.sql`:
 *  - allowed: admin RLS + DELETE grants exist (org features, subscriptions,
 *    special plans, the registry row itself).
 *  - pending-server-side: select-only policy / no policy at all — the delete is
 *    still ATTEMPTED so the audit report records the exact 42501 / missing-table
 *    error, then a manual SQL snippet is included in the report.
 */
export const REGISTRY_TABLES: readonly RegistryTableDescriptor[] = [
  {
    table: "subscription_invoices",
    fkColumn: "subscription_id",
    disposition: "pending-server-side",
  },
  { table: "organization_features", fkColumn: "organization_id", disposition: "allowed" },
  { table: "subscriptions", fkColumn: "organization_registry_id", disposition: "allowed" },
  { table: "organization_special_plans", fkColumn: "organization_registry_id", disposition: "allowed" },
  // Absent from admin_setup.sql (no policy/grant) — organization_id follows the
  // registry naming convention; the attempt records whatever the server answers.
  { table: "powertranz_logs", fkColumn: "organization_id", disposition: "pending-server-side" },
  { table: "powertranz_temp_orders", fkColumn: "organization_id", disposition: "pending-server-side" },
  // Always last: matched by slug so the row is removed even if a child delete failed.
  { table: "organization_registry", fkColumn: "organization_slug", disposition: "allowed" },
];

/** Manual cleanup SQL for tables the browser session cannot delete. */
export function buildRegistryManualSql(
  descriptor: RegistryTableDescriptor,
  orgRegistryId: string,
): string {
  const org = quoteSql(orgRegistryId);
  const header =
    "-- Run server-side with REGISTRY_SERVICE_ROLE_KEY (scripts/lib/migrator.ts) — the admin\n" +
    "-- session only has SELECT here (see supabase/admin_setup.sql). Verify the FK column first.\n";
  if (descriptor.table === "subscription_invoices") {
    return (
      header +
      `DELETE FROM public.subscription_invoices\nWHERE subscription_id IN (\n  SELECT id FROM public.subscriptions\n  WHERE organization_registry_id = ${org}\n);`
    );
  }
  if (descriptor.fkColumn) {
    return header + `DELETE FROM public.${descriptor.table} WHERE ${descriptor.fkColumn} = ${org};`;
  }
  return header + `DELETE FROM public.${descriptor.table} WHERE /* scope by org FK */ organization_id = ${org};`;
}
