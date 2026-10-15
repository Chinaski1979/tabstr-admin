import { getRegistryClient } from "@/integrations/supabase/client";
import { buildRevenueOverview } from "@/lib/revenue";
import type { CollectedRevenueInvoice, ContractedRevenuePlan, RevenueOverview } from "@/types";

function firstEmbed(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown>) ?? null;
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return null;
}

function mapPlan(row: any): ContractedRevenuePlan {
  const org = firstEmbed(row.organization_registry);
  return {
    organizationRegistryId: row.organization_registry_id,
    organizationSlug: (org?.organization_slug as string) ?? "—",
    specialPlanName: row.special_plan_name,
    specialPrice: Number(row.special_price ?? 0),
    startedAt: new Date(row.created_at),
    hasPaidInvoice: false,
  };
}

function mapInvoice(row: any): CollectedRevenueInvoice {
  const subscription = firstEmbed(row.subscriptions);
  const org = firstEmbed(subscription?.organization_registry);
  return {
    id: String(row.id),
    organizationRegistryId: (subscription?.organization_registry_id as string) ?? null,
    organizationSlug: (org?.organization_slug as string) ?? null,
    amount: Number(row.amount ?? 0),
    currency: row.currency ?? null,
    status: row.status ?? "pending",
    processedAt: row.processed_at ?? null,
    createdAt: new Date(row.created_at),
  };
}

async function fetchActiveSpecialPlans(): Promise<ContractedRevenuePlan[]> {
  const supabase = getRegistryClient();
  const { data, error } = await supabase
    .from("organization_special_plans")
    .select(
      `id, organization_registry_id, special_plan_name, special_price, is_active, created_at,
       organization_registry!inner(organization_slug)`,
    )
    .eq("is_active", true)
    .order("special_price", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapPlan);
}

async function fetchInvoices(): Promise<CollectedRevenueInvoice[]> {
  const supabase = getRegistryClient();
  const { data, error } = await supabase
    .from("subscription_invoices")
    .select(
      `id, subscription_id, amount, currency, status, processed_at, created_at,
       subscriptions(
         organization_registry_id,
         organization_registry(organization_slug)
       )`,
    )
    .order("processed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapInvoice);
}

export const revenueService = {
  async getOverview(now: Date = new Date()): Promise<RevenueOverview> {
    const [plans, invoices] = await Promise.all([fetchActiveSpecialPlans(), fetchInvoices()]);
    return buildRevenueOverview(plans, invoices, now);
  },
};
