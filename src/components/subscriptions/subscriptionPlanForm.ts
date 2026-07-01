import { z } from "zod";

import { billingIntervalLabel, type BillingInterval, type SubscriptionPlan } from "@/types";

export type PriceRow = {
  key: string;
  priceId?: string;
  interval: BillingInterval | "";
  price: string;
};

export type PlanPriceInput = {
  id?: string;
  billingInterval: BillingInterval;
  planPrice: number;
};

export const planFormSchema = z.object({
  planName: z.string().min(1, "Plan name is required"),
  isActive: z.boolean(),
});

export type PlanFormValues = z.infer<typeof planFormSchema>;

export function newPriceRow(): PriceRow {
  return { key: crypto.randomUUID(), interval: "", price: "" };
}

export function priceRowsFromPlan(plan: SubscriptionPlan): PriceRow[] {
  if (plan.prices.length === 0) return [newPriceRow()];
  return plan.prices.map((p) => ({
    key: crypto.randomUUID(),
    priceId: p.id,
    interval: p.billingInterval,
    price: String(p.planPrice),
  }));
}

export function defaultIsActive(plan?: SubscriptionPlan): boolean {
  if (!plan) return true;
  return plan.prices.every((p) => p.isActive) || plan.prices.length === 0;
}

export function parsePriceRows(
  priceRows: PriceRow[],
): { ok: true; prices: PlanPriceInput[] } | { ok: false; error: string } {
  const filled = priceRows.filter((row) => row.interval);
  if (filled.length === 0) {
    return { ok: false, error: "Add at least one billing interval with a price." };
  }

  const prices: PlanPriceInput[] = [];
  for (const row of filled) {
    const planPrice = Number(row.price);
    if (!row.price.trim() || Number.isNaN(planPrice) || planPrice <= 0) {
      return {
        ok: false,
        error: `Enter a valid price for ${billingIntervalLabel(row.interval)}.`,
      };
    }
    prices.push({
      id: row.priceId,
      billingInterval: row.interval as BillingInterval,
      planPrice,
    });
  }

  return { ok: true, prices };
}
