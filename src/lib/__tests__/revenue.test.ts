import { describe, expect, it } from "vitest";
import {
  applyIva,
  buildRevenueOverview,
  formatMonthLabel,
  hasPaidInvoiceInMonth,
  invoiceMonthOptions,
  isRevenueEmpty,
  monthKey,
  monthUtcRange,
  processedAtFromPaidOn,
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
    paymentMethod: "card",
    recordedBy: null,
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

  it("builds an exclusive UTC range for a calendar month", () => {
    expect(monthUtcRange("2026-10")).toEqual({
      start: "2026-10-01T00:00:00.000Z",
      end: "2026-11-01T00:00:00.000Z",
    });
  });

  it("includes the current month in invoice filter options", () => {
    expect(
      invoiceMonthOptions([{ month: "2026-09", paidTotal: 40, paidCount: 1, failedTotal: 0, failedCount: 0 }], NOW),
    ).toEqual(["2026-10", "2026-09"]);
  });
});

describe("manual payment helpers", () => {
  it("stores paid-on dates at noon UTC so the calendar month is stable", () => {
    expect(processedAtFromPaidOn("2026-10-15")).toBe("2026-10-15T12:00:00.000Z");
  });

  it("warns when the org already has a paid invoice in that month", () => {
    const invoices = [invoice({ processedAt: "2026-10-04T14:00:00.000Z" })];
    expect(hasPaidInvoiceInMonth(invoices, "org-1", "2026-10-15")).toBe(true);
    expect(hasPaidInvoiceInMonth(invoices, "org-1", "2026-09-01")).toBe(false);
    expect(hasPaidInvoiceInMonth(invoices, "org-2", "2026-10-15")).toBe(false);
  });

  it("drops an org from unbilled after a paid transfer at special_price", () => {
    const specialPrice = 54;
    const before = buildRevenueOverview([plan({ specialPrice })], [], NOW);
    expect(before.unbilledPlanCount).toBe(1);

    const after = buildRevenueOverview(
      [plan({ specialPrice })],
      [
        invoice({
          amount: specialPrice,
          paymentMethod: "transfer",
          recordedBy: "admin-1",
          processedAt: "2026-10-15T12:00:00.000Z",
        }),
      ],
      NOW,
    );

    expect(after.unbilledPlanCount).toBe(0);
    expect(after.collectedThisMonth).toBe(specialPrice);
    expect(after.plans[0].hasPaidInvoice).toBe(true);
  });
});
