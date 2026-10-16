import { getRegistryClient } from "@/integrations/supabase/client";
import { buildBusinessHealth } from "@/lib/business";
import { monthKey } from "@/lib/revenue";
import { revenueService } from "@/services/revenue/revenueService";
import { subscriptionsService } from "@/services/subscriptions/subscriptionsService";
import type {
  BusinessMonthClose,
  BusinessScorecard,
  BusinessSubscriptionRef,
  CloseBusinessMonthInput,
  MrrSnapshotOrg,
} from "@/types";

const CLOSE_SELECT =
  "id, month, cash_on_hand, payroll, infrastructure, other_operating, sales_marketing, note, closed_at, updated_at";

const SNAPSHOT_SELECT =
  "month, organization_registry_id, organization_slug, special_price, is_active, subscription_status";

function mapClose(row: any): BusinessMonthClose {
  return {
    id: row.id,
    month: row.month,
    cashOnHand: Number(row.cash_on_hand ?? 0),
    payroll: Number(row.payroll ?? 0),
    infrastructure: Number(row.infrastructure ?? 0),
    otherOperating: Number(row.other_operating ?? 0),
    salesMarketing: Number(row.sales_marketing ?? 0),
    note: row.note ?? "",
    closedAt: row.closed_at ? new Date(row.closed_at) : null,
    updatedAt: new Date(row.updated_at),
  };
}

function mapSnapshot(row: any): MrrSnapshotOrg {
  return {
    month: row.month,
    organizationRegistryId: row.organization_registry_id,
    organizationSlug: row.organization_slug,
    specialPrice: Number(row.special_price ?? 0),
    isActive: Boolean(row.is_active),
    subscriptionStatus: row.subscription_status ?? null,
  };
}

function firstEmbed(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown>) ?? null;
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return null;
}

/** One special plan per organization. An active plan wins; otherwise the higher price. */
function pickPlanPerOrg(rows: any[]): any[] {
  const byOrg = new Map<string, any>();
  for (const row of rows) {
    const current = byOrg.get(row.organization_registry_id);
    if (!current) {
      byOrg.set(row.organization_registry_id, row);
      continue;
    }
    const currentActive = Boolean(current.is_active);
    const nextActive = Boolean(row.is_active);
    if (nextActive && !currentActive) {
      byOrg.set(row.organization_registry_id, row);
      continue;
    }
    if (nextActive === currentActive && Number(row.special_price) > Number(current.special_price)) {
      byOrg.set(row.organization_registry_id, row);
    }
  }
  return [...byOrg.values()];
}

function isMissingMetricsTable(error: { code?: string; message?: string }): boolean {
  return error.code === "42P01" || error.code === "PGRST205";
}

async function fetchCloses(): Promise<BusinessMonthClose[]> {
  const supabase = getRegistryClient();
  const { data, error } = await supabase
    .from("business_month_closes")
    .select(CLOSE_SELECT)
    .order("month", { ascending: false });
  if (error) {
    if (isMissingMetricsTable(error)) return [];
    throw error;
  }
  return (data ?? []).map(mapClose);
}

async function fetchSnapshots(): Promise<MrrSnapshotOrg[]> {
  const supabase = getRegistryClient();
  const { data, error } = await supabase
    .from("business_mrr_snapshots")
    .select(SNAPSHOT_SELECT)
    .order("month", { ascending: false })
    .order("organization_slug");
  if (error) {
    if (isMissingMetricsTable(error)) return [];
    throw error;
  }
  return (data ?? []).map(mapSnapshot);
}

export const businessService = {
  async getScorecard(now: Date = new Date()): Promise<BusinessScorecard> {
    const month = monthKey(now);
    const [overview, subscriptions, closes, snapshots] = await Promise.all([
      revenueService.getOverview(now),
      subscriptionsService.getAllWithOrg(),
      fetchCloses(),
      fetchSnapshots(),
    ]);

    const subscriptionRefs: BusinessSubscriptionRef[] = subscriptions.map((subscription) => ({
      organizationRegistryId: subscription.organizationRegistryId,
      organizationSlug: subscription.organizationSlug,
      status: subscription.status,
      createdAt: subscription.createdAt,
    }));

    return {
      asOfMonth: month,
      health: buildBusinessHealth({
        plans: overview.plans,
        invoices: overview.invoices,
        subscriptions: subscriptionRefs,
        month,
      }),
      plans: overview.plans,
      invoices: overview.invoices,
      closes,
      snapshots,
    };
  },

  async closeMonth(input: CloseBusinessMonthInput): Promise<void> {
    const supabase = getRegistryClient();
    const nowIso = new Date().toISOString();
    const note = input.note.trim();

    const [planResult, subscriptions] = await Promise.all([
      supabase
        .from("organization_special_plans")
        .select(
          "organization_registry_id, special_price, is_active, organization_registry!inner(organization_slug)",
        ),
      subscriptionsService.getAllWithOrg(),
    ]);
    if (planResult.error) throw planResult.error;

    const latestStatus = new Map<string, string>();
    const newestFirst = [...subscriptions].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    for (const subscription of newestFirst) {
      if (!latestStatus.has(subscription.organizationRegistryId)) {
        latestStatus.set(subscription.organizationRegistryId, subscription.status);
      }
    }

    const { error: deleteError } = await supabase
      .from("business_mrr_snapshots")
      .delete()
      .eq("month", input.month);
    if (deleteError) throw deleteError;

    const rows = pickPlanPerOrg(planResult.data ?? []).map((row) => {
      const org = firstEmbed(row.organization_registry);
      return {
        month: input.month,
        organization_registry_id: row.organization_registry_id,
        organization_slug: (org?.organization_slug as string) ?? "—",
        special_price: Number(row.special_price ?? 0),
        is_active: Boolean(row.is_active),
        subscription_status: latestStatus.get(row.organization_registry_id) ?? null,
      };
    });

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("business_mrr_snapshots").insert(rows);
      if (insertError) throw insertError;
    }

    const { error: closeError } = await supabase.from("business_month_closes").upsert(
      {
        month: input.month,
        cash_on_hand: input.cashOnHand,
        payroll: input.payroll,
        infrastructure: input.infrastructure,
        other_operating: input.otherOperating,
        sales_marketing: input.salesMarketing,
        note: note.length > 0 ? note : null,
        closed_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "month" },
    );
    if (closeError) throw closeError;
  },
};
