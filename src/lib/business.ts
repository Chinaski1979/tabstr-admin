import { IVA_RATE } from "@/types";
import type {
  AtRiskReason,
  BurnResult,
  BusinessAtRiskCustomer,
  BusinessHealth,
  BusinessMonthClose,
  BusinessSubscriptionRef,
  CollectedRevenueInvoice,
  ContractedRevenuePlan,
  CustomerValue,
  MrrSnapshotOrg,
  RetentionMovement,
} from "@/types";
import {
  invoiceOccurredAt,
  isManualInvoice,
  isPaidStatus,
  monthKey,
  roundCurrency,
} from "@/lib/revenue";

export const MIN_LTV_CHURNED_LOGOS = 3;
const TRAILING_LTV_MONTHS = 3;

export function previousMonthKey(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return monthKey(new Date(Date.UTC(year, monthNumber - 2, 1)));
}

export function formatRate(rate: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(rate);
}

export function formatRunway(months: number): string {
  const rounded = Math.round(months * 10) / 10;
  return `${rounded} ${rounded === 1 ? "month" : "months"}`;
}

/**
 * Special-plan price for a paid invoice.
 * Manual rows already store that price. PowerTranz stores the card charge, which includes IVA.
 */
export function invoiceNetAmount(invoice: CollectedRevenueInvoice): number {
  if (!isPaidStatus(invoice.status)) return 0;
  if (isManualInvoice(invoice)) return roundCurrency(invoice.amount);
  return roundCurrency(invoice.amount / (1 + IVA_RATE));
}

export function collectedInMonth(invoices: CollectedRevenueInvoice[], month: string): number {
  let total = 0;
  for (const invoice of invoices) {
    if (monthKey(invoiceOccurredAt(invoice)) !== month) continue;
    total = roundCurrency(total + invoiceNetAmount(invoice));
  }
  return total;
}

export function countNewLogos(plans: ContractedRevenuePlan[], month: string): number {
  return plans.filter((plan) => monthKey(plan.startedAt) === month).length;
}

export function buildBusinessHealth(input: {
  plans: ContractedRevenuePlan[];
  invoices: CollectedRevenueInvoice[];
  subscriptions: BusinessSubscriptionRef[];
  month: string;
}): BusinessHealth {
  const { plans, invoices, subscriptions, month } = input;
  const contractedMrr = roundCurrency(plans.reduce((sum, plan) => sum + plan.specialPrice, 0));
  const paidIds = paidOrganizationIds(invoices, month);
  const paidCustomers = plans.filter((plan) => paidIds.has(plan.organizationRegistryId)).length;

  return {
    month,
    contractedMrr,
    arrProjection: roundCurrency(contractedMrr * 12),
    activeCustomers: plans.length,
    arpu: plans.length === 0 ? null : roundCurrency(contractedMrr / plans.length),
    newLogos: countNewLogos(plans, month),
    collected: collectedInMonth(invoices, month),
    paidCustomers,
    collectionRate: plans.length === 0 ? null : paidCustomers / plans.length,
    atRisk: buildAtRisk(plans, invoices, subscriptions, month),
  };
}

export function buildBurn(input: {
  cashOnHand: number;
  payroll: number;
  infrastructure: number;
  otherOperating: number;
  salesMarketing: number;
  collected: number;
  newLogos: number;
}): BurnResult {
  const grossBurn = roundCurrency(
    input.payroll + input.infrastructure + input.otherOperating + input.salesMarketing,
  );
  const netBurn = roundCurrency(grossBurn - input.collected);
  const cashflowPositive = netBurn <= 0;

  return {
    grossBurn,
    netBurn,
    cashflowPositive,
    runwayMonths: cashflowPositive ? null : roundCurrency(input.cashOnHand / netBurn),
    blendedCac:
      input.newLogos <= 0 ? null : roundCurrency(input.salesMarketing / input.newLogos),
  };
}

export function monthWasClosed(closes: BusinessMonthClose[], month: string): boolean {
  return closes.some((close) => close.month === month && close.closedAt != null);
}

export function buildRetention(
  starting: MrrSnapshotOrg[],
  ending: MrrSnapshotOrg[],
): RetentionMovement {
  const startMap = byOrg(starting);
  const endMap = byOrg(ending);

  let startingMrr = 0;
  let endingMrr = 0;
  let newMrr = 0;
  let expansionMrr = 0;
  let contractionMrr = 0;
  let churnedMrr = 0;
  let startingLogos = 0;
  let endingLogos = 0;
  let churnedLogos = 0;

  for (const row of startMap.values()) {
    if (!row.isActive) continue;
    startingLogos += 1;
    startingMrr = roundCurrency(startingMrr + row.specialPrice);
    const next = endMap.get(row.organizationRegistryId);
    if (!next || !next.isActive) {
      churnedLogos += 1;
      churnedMrr = roundCurrency(churnedMrr + row.specialPrice);
      continue;
    }
    if (next.specialPrice > row.specialPrice) {
      expansionMrr = roundCurrency(expansionMrr + (next.specialPrice - row.specialPrice));
    } else if (next.specialPrice < row.specialPrice) {
      contractionMrr = roundCurrency(contractionMrr + (row.specialPrice - next.specialPrice));
    }
  }

  for (const row of endMap.values()) {
    if (!row.isActive) continue;
    endingLogos += 1;
    endingMrr = roundCurrency(endingMrr + row.specialPrice);
    const previous = startMap.get(row.organizationRegistryId);
    if (!previous || !previous.isActive) {
      newMrr = roundCurrency(newMrr + row.specialPrice);
    }
  }

  const logoChurnRate = startingLogos === 0 ? null : churnedLogos / startingLogos;
  const grr =
    startingMrr === 0 ? null : (startingMrr - churnedMrr - contractionMrr) / startingMrr;
  const nrr =
    startingMrr === 0
      ? null
      : (startingMrr - churnedMrr - contractionMrr + expansionMrr) / startingMrr;

  return {
    startingMrr,
    endingMrr,
    newMrr,
    expansionMrr,
    contractionMrr,
    churnedMrr,
    startingLogos,
    endingLogos,
    churnedLogos,
    logoChurnRate,
    grr,
    nrr,
  };
}

export function buildCustomerValue(input: {
  endMonth: string;
  snapshots: MrrSnapshotOrg[];
  closes: BusinessMonthClose[];
  plans: ContractedRevenuePlan[];
  arpu: number | null;
}): CustomerValue {
  const pairs = trailingMonthPairs(input.endMonth, TRAILING_LTV_MONTHS);
  let churnedLogos = 0;
  let rateSum = 0;
  let rateCount = 0;
  let sales = 0;
  let newLogos = 0;
  let monthsUsed = 0;

  for (const pair of pairs) {
    if (!monthWasClosed(input.closes, pair.previous) || !monthWasClosed(input.closes, pair.current)) {
      continue;
    }
    monthsUsed += 1;
    const movement = buildRetention(
      snapshotsForMonth(input.snapshots, pair.previous),
      snapshotsForMonth(input.snapshots, pair.current),
    );
    churnedLogos += movement.churnedLogos;
    if (movement.logoChurnRate != null) {
      rateSum += movement.logoChurnRate;
      rateCount += 1;
    }
    const close = input.closes.find((row) => row.month === pair.current);
    sales = roundCurrency(sales + (close?.salesMarketing ?? 0));
    newLogos += countNewLogos(input.plans, pair.current);
  }

  const averageChurn = rateCount === 0 ? null : rateSum / rateCount;
  const ltv =
    churnedLogos >= MIN_LTV_CHURNED_LOGOS &&
    averageChurn != null &&
    averageChurn > 0 &&
    input.arpu != null &&
    input.arpu > 0
      ? roundCurrency(input.arpu / averageChurn)
      : null;
  const cac = newLogos > 0 ? roundCurrency(sales / newLogos) : null;

  return {
    ltv,
    ltvCac: ltv != null && cac != null && cac > 0 ? roundCurrency(ltv / cac) : null,
    churnedLogos,
    monthsUsed,
  };
}

export function snapshotsForMonth(snapshots: MrrSnapshotOrg[], month: string): MrrSnapshotOrg[] {
  return snapshots.filter((row) => row.month === month);
}

function trailingMonthPairs(endMonth: string, count: number): { previous: string; current: string }[] {
  const pairs: { previous: string; current: string }[] = [];
  let current = endMonth;
  for (let index = 0; index < count; index += 1) {
    const previous = previousMonthKey(current);
    pairs.unshift({ previous, current });
    current = previous;
  }
  return pairs;
}

function paidOrganizationIds(invoices: CollectedRevenueInvoice[], month: string): Set<string> {
  const ids = new Set<string>();
  for (const invoice of invoices) {
    if (!invoice.organizationRegistryId || !isPaidStatus(invoice.status)) continue;
    if (monthKey(invoiceOccurredAt(invoice)) !== month) continue;
    ids.add(invoice.organizationRegistryId);
  }
  return ids;
}

function buildAtRisk(
  plans: ContractedRevenuePlan[],
  invoices: CollectedRevenueInvoice[],
  subscriptions: BusinessSubscriptionRef[],
  month: string,
): BusinessAtRiskCustomer[] {
  const reasons = new Map<string, { slug: string; reasons: Set<AtRiskReason> }>();

  function add(id: string, slug: string, reason: AtRiskReason) {
    const existing = reasons.get(id);
    if (existing) {
      existing.reasons.add(reason);
      if (existing.slug === "—" && slug !== "—") existing.slug = slug;
      return;
    }
    reasons.set(id, { slug, reasons: new Set([reason]) });
  }

  const latest = new Map<string, BusinessSubscriptionRef>();
  const ordered = [...subscriptions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  for (const subscription of ordered) {
    if (!latest.has(subscription.organizationRegistryId)) {
      latest.set(subscription.organizationRegistryId, subscription);
    }
  }
  for (const subscription of latest.values()) {
    if (subscription.status.toLowerCase() === "past_due") {
      add(subscription.organizationRegistryId, subscription.organizationSlug, "past_due");
    }
  }

  for (const invoice of invoices) {
    if (!invoice.organizationRegistryId) continue;
    if (invoice.status.toLowerCase() !== "failed") continue;
    if (monthKey(invoiceOccurredAt(invoice)) !== month) continue;
    add(invoice.organizationRegistryId, invoice.organizationSlug ?? "—", "failed_invoice");
  }

  for (const plan of plans) {
    if (!plan.hasPaidInvoice) {
      add(plan.organizationRegistryId, plan.organizationSlug, "unbilled");
    }
  }

  const order: AtRiskReason[] = ["past_due", "failed_invoice", "unbilled"];
  return [...reasons.entries()]
    .map(([organizationRegistryId, value]) => ({
      organizationRegistryId,
      organizationSlug: value.slug,
      reasons: order.filter((reason) => value.reasons.has(reason)),
    }))
    .sort((a, b) => a.organizationSlug.localeCompare(b.organizationSlug));
}

function byOrg(rows: MrrSnapshotOrg[]): Map<string, MrrSnapshotOrg> {
  const map = new Map<string, MrrSnapshotOrg>();
  for (const row of rows) map.set(row.organizationRegistryId, row);
  return map;
}
