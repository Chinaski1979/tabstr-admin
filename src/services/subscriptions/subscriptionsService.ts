import { getRegistryClient } from "@/integrations/supabase/client";
import type {
  CreateSubscriptionPlanInput,
  OrganizationSpecialPlan,
  Subscription,
  SubscriptionInvoice,
  SubscriptionPlan,
  UpdateSubscriptionPlanInput,
} from "@/types";

function firstEmbed(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown>) ?? null;
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return null;
}

function mapPlan(row: any): SubscriptionPlan {
  return {
    id: row.id,
    planName: row.plan_name,
    prices: (row.subscription_plan_prices ?? []).map((p: any) => ({
      id: p.id,
      billingInterval: p.billing_interval,
      planPrice: Number(p.plan_price ?? 0),
      isActive: p.is_active ?? false,
    })),
  };
}

function mapSubscription(row: any): Subscription {
  const planName =
    (firstEmbed(row.organization_special_plans)?.special_plan_name as string | undefined) ??
    (firstEmbed(row.subscription_plans)?.plan_name as string | undefined) ??
    null;

  return {
    id: row.id,
    organizationRegistryId: row.organization_registry_id,
    planId: row.plan_id ?? null,
    specialPlanId: row.special_plan_id ?? null,
    powertranzSubscriptionId: row.powertranz_subscription_id,
    status: row.status,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    frequency: row.frequency ?? null,
    nextExecutionDate: row.next_execution_date ?? null,
    planName,
    createdAt: new Date(row.created_at),
  };
}

function mapInvoice(row: any): SubscriptionInvoice {
  return {
    id: String(row.id),
    subscriptionId: row.subscription_id,
    amount: Number(row.amount ?? 0),
    currency: row.currency ?? null,
    status: row.status ?? "pending",
    powertranzTransactionId: row.powertranz_transaction_id ?? null,
    processedAt: row.processed_at ?? null,
    createdAt: new Date(row.created_at),
  };
}

export const subscriptionsService = {
  async create(input: CreateSubscriptionPlanInput): Promise<SubscriptionPlan> {
    const supabase = getRegistryClient();
    const planName = input.planName.trim();

    const { data: planRow, error: planError } = await supabase
      .from("subscription_plans")
      .insert({ plan_name: planName })
      .select("id, plan_name")
      .single();

    if (planError) throw planError;

    const { data: priceRows, error: priceError } = await supabase
      .from("subscription_plan_prices")
      .insert(
        input.prices.map((price) => ({
          plan_id: planRow.id,
          billing_interval: price.billingInterval,
          plan_price: price.planPrice,
          is_active: input.isActive ?? true,
        })),
      )
      .select("billing_interval, plan_price, is_active");

    if (priceError) {
      await supabase.from("subscription_plans").delete().eq("id", planRow.id);
      throw priceError;
    }

    return mapPlan({ ...planRow, subscription_plan_prices: priceRows ?? [] });
  },

  async update(planId: string, input: UpdateSubscriptionPlanInput): Promise<SubscriptionPlan> {
    const supabase = getRegistryClient();
    const planName = input.planName.trim();
    const isActive = input.isActive ?? true;

    const { data: planRow, error: planError } = await supabase
      .from("subscription_plans")
      .update({ plan_name: planName })
      .eq("id", planId)
      .select("id, plan_name")
      .single();

    if (planError) throw planError;

    const { data: existing, error: fetchError } = await supabase
      .from("subscription_plan_prices")
      .select("id")
      .eq("plan_id", planId);

    if (fetchError) throw fetchError;

    const keptIds = new Set(input.prices.filter((p) => p.id).map((p) => p.id));
    const toDelete = (existing ?? []).map((r) => r.id).filter((id) => !keptIds.has(id));

    if (toDelete.length > 0) {
      const { error } = await supabase
        .from("subscription_plan_prices")
        .delete()
        .in("id", toDelete);
      if (error) throw error;
    }

    for (const price of input.prices) {
      if (price.id) {
        const { error } = await supabase
          .from("subscription_plan_prices")
          .update({
            billing_interval: price.billingInterval,
            plan_price: price.planPrice,
            is_active: isActive,
          })
          .eq("id", price.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subscription_plan_prices").insert({
          plan_id: planId,
          billing_interval: price.billingInterval,
          plan_price: price.planPrice,
          is_active: isActive,
        });
        if (error) throw error;
      }
    }

    const { data: priceRows, error: priceError } = await supabase
      .from("subscription_plan_prices")
      .select("id, billing_interval, plan_price, is_active")
      .eq("plan_id", planId);

    if (priceError) throw priceError;

    return mapPlan({ ...planRow, subscription_plan_prices: priceRows ?? [] });
  },

  async delete(planId: string): Promise<void> {
    const supabase = getRegistryClient();

    const { error: pricesError } = await supabase
      .from("subscription_plan_prices")
      .delete()
      .eq("plan_id", planId);
    if (pricesError) throw pricesError;

    const { error } = await supabase.from("subscription_plans").delete().eq("id", planId);
    if (error) throw error;
  },

  async getPlans(): Promise<SubscriptionPlan[]> {
    const supabase = getRegistryClient();
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("id, plan_name, subscription_plan_prices(id, billing_interval, plan_price, is_active)")
      .order("plan_name");

    if (error) throw error;
    return (data ?? []).map(mapPlan);
  },

  async getSpecialPlanForOrg(orgRegistryId: string): Promise<OrganizationSpecialPlan | null> {
    const supabase = getRegistryClient();
    const { data, error } = await supabase
      .from("organization_special_plans")
      .select("id, organization_registry_id, special_plan_name, special_price, is_active")
      .eq("organization_registry_id", orgRegistryId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      organizationRegistryId: data.organization_registry_id,
      specialPlanName: data.special_plan_name,
      specialPrice: Number(data.special_price ?? 0),
      isActive: data.is_active ?? false,
    };
  },

  /** Latest subscription row for an org (most recently created). */
  async getCurrentForOrg(orgRegistryId: string): Promise<Subscription | null> {
    const supabase = getRegistryClient();
    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        `id, organization_registry_id, plan_id, special_plan_id, powertranz_subscription_id,
         status, start_date, end_date, frequency, next_execution_date, created_at,
         subscription_plans(plan_name),
         organization_special_plans(special_plan_name)`,
      )
      .eq("organization_registry_id", orgRegistryId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? mapSubscription(data) : null;
  },

  /**
   * All subscriptions joined with their organization slug — for the cross-org
   * subscriptions overview. Ordered newest first.
   */
  async getAllWithOrg(): Promise<(Subscription & { organizationSlug: string })[]> {
    const supabase = getRegistryClient();
    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        `id, organization_registry_id, plan_id, special_plan_id, powertranz_subscription_id,
         status, start_date, end_date, frequency, next_execution_date, created_at,
         subscription_plans(plan_name),
         organization_special_plans(special_plan_name),
         organization_registry!inner(organization_slug)`,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapSubscription(row),
      organizationSlug: firstEmbed(row.organization_registry)?.organization_slug as string,
    }));
  },

  async getInvoicesForOrg(orgRegistryId: string): Promise<SubscriptionInvoice[]> {
    const supabase = getRegistryClient();
    const { data, error } = await supabase
      .from("subscription_invoices")
      .select(
        `id, subscription_id, amount, currency, status, powertranz_transaction_id,
         processed_at, created_at,
         subscriptions!inner(organization_registry_id)`,
      )
      .eq("subscriptions.organization_registry_id", orgRegistryId)
      .order("processed_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapInvoice);
  },
};
