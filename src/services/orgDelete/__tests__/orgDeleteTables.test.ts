import { describe, it, expect } from "vitest";

import {
  ORG_SCOPED_TABLES,
  SKIP_TABLES,
  REGISTRY_TABLES,
  PHASE2_DISABLE_STATEMENTS,
  PHASE2_ENABLE_STATEMENTS,
  buildPhase1Statements,
  buildPhase2DeleteStatement,
  buildAllStatements,
  quoteSql,
} from "../orgDeleteTables";

const ORG_ID = "11111111-2222-3333-4444-555555555555";

describe("orgDeleteTables", () => {
  it("lists 32 org-scoped tables with exactly the 4 known skip tables", () => {
    expect(ORG_SCOPED_TABLES).toHaveLength(32);
    expect(SKIP_TABLES).toEqual([
      "tab_item_promotion_components",
      "product_promotion_groups",
      "product_promotion_options",
      "kitchen_ticket_items",
    ]);
    // Every skip table is one of the org-scoped tables.
    for (const table of SKIP_TABLES) {
      expect(ORG_SCOPED_TABLES).toContain(table);
    }
  });

  it("scopes every Phase 1 statement to the org id", () => {
    const statements = buildPhase1Statements(ORG_ID);
    expect(statements.length).toBeGreaterThan(0);
    for (const sql of statements) {
      expect(sql).toContain(`organization_id = '${ORG_ID}'`);
      expect(sql).not.toContain("organization_id = ''");
    }
  });

  it("Phase 1 breaks the known blocking FKs with IS NOT NULL guards", () => {
    const statements = buildPhase1Statements(ORG_ID);

    // Child table without organization_id — scoped through tab_items.
    expect(statements[0]).toBe(
      `DELETE FROM tab_item_promotion_components WHERE tab_item_id IN (SELECT id FROM tab_items WHERE organization_id = '${ORG_ID}')`,
    );
    // room_id cleanup.
    expect(statements[1]).toBe(
      `UPDATE organization_tables SET room_id = NULL WHERE organization_id = '${ORG_ID}'`,
    );

    // auth.users FKs — all nullified with the IS NOT NULL guard.
    const authFks: Array<[string, string]> = [
      ["tabs", "created_by"],
      ["sales", "sold_by"],
      ["cash_balances", "balanced_by"],
      ["cash_withdrawals", "withdrawn_by"],
      ["shift_closures", "closed_by"],
      ["accepted_orders_history", "order_imported_by"],
    ];
    for (const [table, column] of authFks) {
      expect(statements).toContain(
        `UPDATE ${table} SET ${column} = NULL WHERE organization_id = '${ORG_ID}' AND ${column} IS NOT NULL`,
      );
    }

    // FKs to other tenant tables.
    const tableFks: Array<[string, string]> = [
      ["ingredients", "provider_id"],
      ["sales", "payment_method_id"],
      ["sales", "tab_id"],
    ];
    for (const [table, column] of tableFks) {
      expect(statements).toContain(
        `UPDATE ${table} SET ${column} = NULL WHERE organization_id = '${ORG_ID}' AND ${column} IS NOT NULL`,
      );
    }
  });

  it("Phase 2 disables both triggers, deletes only the org row and re-enables both", () => {
    expect(PHASE2_DISABLE_STATEMENTS).toEqual([
      "ALTER TABLE tabs DISABLE TRIGGER trg_tab_deletions_history",
      "ALTER TABLE tab_items DISABLE TRIGGER trg_tab_item_history_changes",
    ]);
    expect(buildPhase2DeleteStatement(ORG_ID)).toBe(
      `DELETE FROM organizations WHERE id = '${ORG_ID}'`,
    );
    expect(PHASE2_ENABLE_STATEMENTS).toHaveLength(2);
    expect(PHASE2_ENABLE_STATEMENTS[0]).toBe("ALTER TABLE tabs ENABLE TRIGGER trg_tab_deletions_history");
    expect(PHASE2_ENABLE_STATEMENTS[1]).toBe(
      "ALTER TABLE tab_items ENABLE TRIGGER trg_tab_item_history_changes",
    );
  });

  it("buildAllStatements is Phase 1 followed by Phase 2", () => {
    const all = buildAllStatements(ORG_ID);
    expect(all).toHaveLength(buildPhase1Statements(ORG_ID).length + 5);
    expect(all[all.length - 1]).toBe(PHASE2_ENABLE_STATEMENTS[1]);
  });

  it("escapes quotes when interpolating ids", () => {
    expect(quoteSql("a'b")).toBe("'a''b'");
    expect(buildPhase2DeleteStatement("a'b")).toContain("'a''b'");
  });

  it("registry plan deletes children first and organization_registry last", () => {
    const tables = REGISTRY_TABLES.map((d) => d.table);
    expect(tables[tables.length - 1]).toBe("organization_registry");
    expect(tables.indexOf("subscription_invoices")).toBeLessThan(tables.indexOf("subscriptions"));
    for (const descriptor of REGISTRY_TABLES) {
      expect(descriptor.fkColumn).toBeTruthy();
    }
  });
});
