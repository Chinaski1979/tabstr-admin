import { getRegistryClient } from "@/integrations/supabase/client";
import { buildRevenueOverview, monthUtcRange, processedAtFromPaidOn } from "@/lib/revenue";
import type {
  CollectedRevenueInvoice,
  ContractedRevenuePlan,
  CreateManualPaymentInput,
  RevenueOverview,
} from "@/types";

const INVOICE_SELECT = `
  id, subscription_id, organization_registry_id, amount, currency, status,
  payment_method, recorded_by, processed_at, created_at,
  organization_registry(organization_slug)
`;

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
  const org = firstEmbed(row.organization_registry);
  return {
    id: String(row.id),
    organizationRegistryId: row.organization_registry_id ?? null,
    organizationSlug: (org?.organization_slug as string) ?? null,
    amount: Number(row.amount ?? 0),
    currency: row.currency ?? null,
    status: row.status ?? "pending",
    paymentMethod: row.payment_method === "transfer" ? "transfer" : "card",
    recordedBy: row.recorded_by ?? null,
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
    .select(INVOICE_SELECT)
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

  async getInvoicesForMonth(month: string): Promise<CollectedRevenueInvoice[]> {
    const { start, end } = monthUtcRange(month);
    const supabase = getRegistryClient();
    const { data, error } = await supabase
      .from("subscription_invoices")
      .select(INVOICE_SELECT)
      .gte("processed_at", start)
      .lt("processed_at", end)
      .order("processed_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapInvoice);
  },

  async createManualPayment(input: CreateManualPaymentInput): Promise<CollectedRevenueInvoice> {
    const supabase = getRegistryClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const userId = userData.user?.id;
    if (!userId) throw new Error("Not signed in");

    const { data: plan, error: planError } = await supabase
      .from("organization_special_plans")
      .select("special_price, is_active")
      .eq("organization_registry_id", input.organizationRegistryId)
      .eq("is_active", true)
      .maybeSingle();
    if (planError) throw planError;
    if (!plan) throw new Error("This organization has no active special plan.");

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("organization_registry_id", input.organizationRegistryId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subError) throw subError;

    const { data, error } = await supabase
      .from("subscription_invoices")
      .insert({
        organization_registry_id: input.organizationRegistryId,
        subscription_id: subscription?.id ?? null,
        amount: Number(plan.special_price),
        currency: "USD",
        status: "paid",
        processed_at: processedAtFromPaidOn(input.paidOn),
        payment_method: input.paymentMethod,
        recorded_by: userId,
        powertranz_transaction_id: null,
      })
      .select(INVOICE_SELECT)
      .single();

    if (error) throw error;
    return mapInvoice(data);
  },

  async deleteManualPayment(invoiceId: string): Promise<void> {
    const supabase = getRegistryClient();
    const { error } = await supabase
      .from("subscription_invoices")
      .delete()
      .eq("id", invoiceId)
      .not("recorded_by", "is", null);
    if (error) throw error;
  },
};
