import { IVA_RATE } from "@/types";
import type {
  CollectedRevenueInvoice,
  CollectedRevenueMonth,
  ContractedRevenuePlan,
  RevenueOverview,
} from "@/types";

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/** IVA on top of a net special_price. Used only for the "clients pay" subtitle. */
export function applyIva(net: number): number {
  return roundCurrency(net * (1 + IVA_RATE));
}

export function invoiceOccurredAt(invoice: CollectedRevenueInvoice): Date {
  const raw = invoice.processedAt ?? invoice.createdAt;
  return raw instanceof Date ? raw : new Date(raw);
}

export function monthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function yearKey(date: Date): string {
  return String(date.getUTCFullYear());
}

export function formatMonthLabel(month: string): string {
  const date = new Date(`${month}-01T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return month;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function isPaidStatus(status: string): boolean {
  return status.toLowerCase() === "paid";
}

export function isFailedStatus(status: string): boolean {
  return status.toLowerCase() === "failed";
}

export function isRevenueEmpty(overview: RevenueOverview): boolean {
  return overview.plans.length === 0 && overview.invoices.length === 0;
}

export function buildRevenueOverview(
  plans: ContractedRevenuePlan[],
  invoices: CollectedRevenueInvoice[],
  now: Date = new Date(),
): RevenueOverview {
  const paidOrgIds = new Set(
    invoices.filter((invoice) => isPaidStatus(invoice.status) && invoice.organizationRegistryId).map(
      (invoice) => invoice.organizationRegistryId as string,
    ),
  );

  const annotatedPlans = [...plans]
    .map((plan) => ({
      ...plan,
      hasPaidInvoice: paidOrgIds.has(plan.organizationRegistryId),
    }))
    .sort((a, b) => b.specialPrice - a.specialPrice || a.organizationSlug.localeCompare(b.organizationSlug));

  const contractedNet = roundCurrency(
    annotatedPlans.reduce((sum, plan) => sum + plan.specialPrice, 0),
  );
  const contractedGross = applyIva(contractedNet);

  const currentMonth = monthKey(now);
  const currentYear = yearKey(now);

  const buckets = new Map<string, CollectedRevenueMonth>();

  function bucketFor(month: string): CollectedRevenueMonth {
    const existing = buckets.get(month);
    if (existing) return existing;
    const created: CollectedRevenueMonth = {
      month,
      paidTotal: 0,
      paidCount: 0,
      failedTotal: 0,
      failedCount: 0,
    };
    buckets.set(month, created);
    return created;
  }

  let collectedThisMonth = 0;
  let collectedThisYear = 0;
  let failedThisMonth = 0;
  let failedThisYear = 0;

  for (const invoice of invoices) {
    const occurred = invoiceOccurredAt(invoice);
    const month = monthKey(occurred);
    const year = yearKey(occurred);
    const bucket = bucketFor(month);
    const amount = roundCurrency(invoice.amount);

    if (isPaidStatus(invoice.status)) {
      bucket.paidTotal = roundCurrency(bucket.paidTotal + amount);
      bucket.paidCount += 1;
      if (month === currentMonth) collectedThisMonth = roundCurrency(collectedThisMonth + amount);
      if (year === currentYear) collectedThisYear = roundCurrency(collectedThisYear + amount);
    } else if (isFailedStatus(invoice.status)) {
      bucket.failedTotal = roundCurrency(bucket.failedTotal + amount);
      bucket.failedCount += 1;
      if (month === currentMonth) failedThisMonth = roundCurrency(failedThisMonth + amount);
      if (year === currentYear) failedThisYear = roundCurrency(failedThisYear + amount);
    }
  }

  const byMonth = [...buckets.values()].sort((a, b) => b.month.localeCompare(a.month));

  const sortedInvoices = [...invoices].sort((a, b) => {
    return invoiceOccurredAt(b).getTime() - invoiceOccurredAt(a).getTime();
  });

  return {
    contractedNet,
    contractedGross,
    yearlyNetProjection: roundCurrency(contractedNet * 12),
    yearlyGrossProjection: roundCurrency(contractedGross * 12),
    contributingPlanCount: annotatedPlans.length,
    unbilledPlanCount: annotatedPlans.filter((plan) => !plan.hasPaidInvoice).length,
    collectedThisMonth,
    collectedThisYear,
    failedThisMonth,
    failedThisYear,
    plans: annotatedPlans,
    byMonth,
    invoices: sortedInvoices,
  };
}
