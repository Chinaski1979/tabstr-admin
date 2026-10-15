import { describe, expect, it } from "vitest";
import {
  applyIva,
  buildRevenueOverview,
  formatMonthLabel,
  isRevenueEmpty,
  monthKey,
  roundCurrency,
} from "@/lib/revenue";
import type { CollectedRevenueInvoice, ContractedRevenuePlan } from "@/types";

const NOW = new Date("2026-10-15T12:00:00.000Z");

function plan(overrides: Partial<ContractedRevenuePlan> = {}): ContractedRevenuePlan {
  return {
    organizationRegistryId: "org-1",
    organizationSlug: "acme",
    specialPlanName: "Special",
    specialPrice: 54,
    startedAt: new Date("2026-08-03T00:00:00.000Z"),
    hasPaidInvoice: false,
    ...overrides,
  };
}

function invoice(overrides: Partial<CollectedRevenueInvoice> = {}): CollectedRevenueInvoice {
  return {
    id: "inv-1",
    organizationRegistryId: "org-1",
    organizationSlug: "acme",
    amount: 61.02,
    currency: "USD",
    status: "paid",
    processedAt: "2026-10-04T14:06:41.000Z",
    createdAt: new Date("2026-10-04T14:06:41.000Z"),
    ...overrides,
  };
}

describe("applyIva", () => {
  it("adds 13% and matches live card charges", () => {
    expect(applyIva(54)).toBe(61.02);
    expect(applyIva(66)).toBe(74.58);
    expect(applyIva(55)).toBe(62.15);
  });
});

describe("buildRevenueOverview", () => {
  it("sums active special plans as contracted net and projects yearly × 12", () => {
    const overview = buildRevenueOverview(
      [plan({ specialPrice: 54 }), plan({ organizationRegistryId: "org-2", organizationSlug: "beta", specialPrice: 66 })],
      [],
      NOW,
    );

    expect(overview.contractedNet).toBe(120);
    expect(overview.contractedGross).toBe(135.6);
    expect(overview.yearlyNetProjection).toBe(1440);
    expect(overview.yearlyGrossProjection).toBe(roundCurrency(135.6 * 12));
    expect(overview.contributingPlanCount).toBe(2);
    expect(overview.unbilledPlanCount).toBe(2);
  });

  it("counts paid invoices in the current month and year, and failed separately", () => {
    const overview = buildRevenueOverview(
      [plan()],
      [
        invoice({ id: "paid-oct", amount: 61.02, status: "paid", processedAt: "2026-10-04T14:00:00.000Z" }),
        invoice({
          id: "paid-sep",
          amount: 61.02,
          status: "paid",
          processedAt: "2026-09-04T14:00:00.000Z",
          createdAt: new Date("2026-09-04T14:00:00.000Z"),
        }),
        invoice({
          id: "failed-oct",
          amount: 74.58,
          status: "failed",
          organizationRegistryId: "org-2",
          processedAt: "2026-10-07T14:00:00.000Z",
        }),
      ],
      NOW,
    );

    expect(overview.collectedThisMonth).toBe(61.02);
    expect(overview.collectedThisYear).toBe(122.04);
    expect(overview.failedThisMonth).toBe(74.58);
    expect(overview.failedThisYear).toBe(74.58);
    expect(overview.unbilledPlanCount).toBe(0);
    expect(overview.plans[0].hasPaidInvoice).toBe(true);
    expect(overview.byMonth.map((row) => row.month)).toEqual(["2026-10", "2026-09"]);
    expect(overview.byMonth[0]).toMatchObject({
      paidTotal: 61.02,
      paidCount: 1,
      failedTotal: 74.58,
      failedCount: 1,
    });
  });

  it("uses created_at when processed_at is missing", () => {
    const overview = buildRevenueOverview(
      [],
      [
        invoice({
          processedAt: null,
          createdAt: new Date("2026-08-04T19:08:48.000Z"),
          amount: 61.02,
        }),
      ],
      NOW,
    );

    expect(overview.byMonth[0].month).toBe("2026-08");
    expect(overview.collectedThisMonth).toBe(0);
    expect(overview.collectedThisYear).toBe(61.02);
  });

  it("does not treat last-year paid invoices as this year", () => {
    const overview = buildRevenueOverview(
      [],
      [
        invoice({
          processedAt: "2025-12-31T23:00:00.000Z",
          createdAt: new Date("2025-12-31T23:00:00.000Z"),
          amount: 100,
        }),
      ],
      NOW,
    );

    expect(overview.collectedThisYear).toBe(0);
    expect(overview.byMonth[0].month).toBe("2025-12");
  });
});

describe("isRevenueEmpty / month labels", () => {
  it("is empty only when there are no plans and no invoices", () => {
    expect(isRevenueEmpty(buildRevenueOverview([], [], NOW))).toBe(true);
    expect(isRevenueEmpty(buildRevenueOverview([plan()], [], NOW))).toBe(false);
    expect(isRevenueEmpty(buildRevenueOverview([], [invoice()], NOW))).toBe(false);
  });

  it("formats UTC month keys", () => {
    expect(monthKey(NOW)).toBe("2026-10");
    expect(formatMonthLabel("2026-07")).toBe("Jul 2026");
  });
});
