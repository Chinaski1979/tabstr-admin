import { describe, expect, it } from "vitest";
import {
  buildBurn,
  buildBusinessHealth,
  buildCustomerValue,
  buildRetention,
  collectedInMonth,
  invoiceNetAmount,
  previousMonthKey,
} from "@/lib/business";
import type {
  BusinessMonthClose,
  BusinessSubscriptionRef,
  CollectedRevenueInvoice,
  ContractedRevenuePlan,
  MrrSnapshotOrg,
} from "@/types";

const MONTH = "2026-10";

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

function close(month: string, salesMarketing = 0): BusinessMonthClose {
  return {
    id: month,
    month,
    cashOnHand: 0,
    payroll: 0,
    infrastructure: 0,
    otherOperating: 0,
    salesMarketing,
    note: "",
    closedAt: new Date(`${month}-01T00:00:00.000Z`),
    updatedAt: new Date(`${month}-01T00:00:00.000Z`),
  };
}

function snap(
  month: string,
  organizationRegistryId: string,
  specialPrice: number,
  isActive = true,
): MrrSnapshotOrg {
  return {
    month,
    organizationRegistryId,
    organizationSlug: organizationRegistryId,
    specialPrice,
    isActive,
    subscriptionStatus: "active",
  };
}

describe("invoice net amount", () => {
  it("keeps a manual payment at the special-plan price", () => {
    expect(invoiceNetAmount(invoice({ amount: 54, recordedBy: "admin-1", paymentMethod: "transfer" }))).toBe(
      54,
    );
  });

  it("removes 13% IVA from a PowerTranz charge", () => {
    expect(invoiceNetAmount(invoice({ amount: 61.02, recordedBy: null }))).toBe(54);
    expect(invoiceNetAmount(invoice({ amount: 74.58, recordedBy: null }))).toBe(66);
  });

  it("ignores failed invoices", () => {
    expect(invoiceNetAmount(invoice({ status: "failed" }))).toBe(0);
  });
});

describe("buildBusinessHealth", () => {
  const plans = [
    plan({ hasPaidInvoice: true }),
    plan({
      organizationRegistryId: "org-2",
      organizationSlug: "beta",
      specialPrice: 66,
      startedAt: new Date("2026-10-02T00:00:00.000Z"),
      hasPaidInvoice: false,
    }),
  ];
  const invoices = [
    invoice(),
    invoice({
      id: "transfer",
      organizationRegistryId: "org-2",
      organizationSlug: "beta",
      amount: 66,
      recordedBy: "admin-1",
      paymentMethod: "transfer",
      status: "failed",
    }),
  ];
  const subscriptions: BusinessSubscriptionRef[] = [
    {
      organizationRegistryId: "org-1",
      organizationSlug: "acme",
      status: "past_due",
      createdAt: new Date("2026-10-01T00:00:00.000Z"),
    },
  ];

  it("counts MRR, a new logo, collection, and at-risk reasons", () => {
    const health = buildBusinessHealth({ plans, invoices, subscriptions, month: MONTH });

    expect(health.contractedMrr).toBe(120);
    expect(health.arrProjection).toBe(1440);
    expect(health.activeCustomers).toBe(2);
    expect(health.arpu).toBe(60);
    expect(health.newLogos).toBe(1);
    expect(health.collected).toBe(54);
    expect(health.paidCustomers).toBe(1);
    expect(health.collectionRate).toBe(0.5);
    expect(collectedInMonth(invoices, MONTH)).toBe(54);
    expect(health.atRisk.map((row) => row.organizationSlug)).toEqual(["acme", "beta"]);
    expect(health.atRisk[0].reasons).toEqual(["past_due"]);
    expect(health.atRisk[1].reasons).toEqual(["failed_invoice", "unbilled"]);
  });

  it("leaves rates empty when there are no active plans", () => {
    const health = buildBusinessHealth({
      plans: [],
      invoices: [],
      subscriptions: [],
      month: MONTH,
    });
    expect(health.arpu).toBeNull();
    expect(health.collectionRate).toBeNull();
  });
});

describe("buildBurn", () => {
  it("computes gross burn, net burn, runway, and blended CAC", () => {
    const burn = buildBurn({
      cashOnHand: 10000,
      payroll: 3000,
      infrastructure: 200,
      otherOperating: 100,
      salesMarketing: 700,
      collected: 2000,
      newLogos: 2,
    });

    expect(burn.grossBurn).toBe(4000);
    expect(burn.netBurn).toBe(2000);
    expect(burn.cashflowPositive).toBe(false);
    expect(burn.runwayMonths).toBe(5);
    expect(burn.blendedCac).toBe(350);
  });

  it("hides runway when the month is cashflow positive and CAC when there are no new logos", () => {
    const burn = buildBurn({
      cashOnHand: 10000,
      payroll: 100,
      infrastructure: 0,
      otherOperating: 0,
      salesMarketing: 0,
      collected: 200,
      newLogos: 0,
    });

    expect(burn.cashflowPositive).toBe(true);
    expect(burn.runwayMonths).toBeNull();
    expect(burn.blendedCac).toBeNull();
  });
});

describe("retention and customer value", () => {
  it("splits new, expansion, contraction, and churned MRR", () => {
    const movement = buildRetention(
      [
        snap("2026-09", "stay", 100),
        snap("2026-09", "up", 50),
        snap("2026-09", "down", 80),
        snap("2026-09", "gone", 40),
      ],
      [
        snap("2026-10", "stay", 100),
        snap("2026-10", "up", 70),
        snap("2026-10", "down", 60),
        snap("2026-10", "new", 30),
        snap("2026-10", "gone", 40, false),
      ],
    );

    expect(movement.startingMrr).toBe(270);
    expect(movement.endingMrr).toBe(260);
    expect(movement.newMrr).toBe(30);
    expect(movement.expansionMrr).toBe(20);
    expect(movement.contractionMrr).toBe(20);
    expect(movement.churnedMrr).toBe(40);
    expect(movement.churnedLogos).toBe(1);
    expect(movement.logoChurnRate).toBe(0.25);
    expect(movement.grr).toBeCloseTo((270 - 40 - 20) / 270);
    expect(movement.nrr).toBeCloseTo((270 - 40 - 20 + 20) / 270);
  });

  it("hides LTV until three logos have churned, then compares it with CAC", () => {
    const snapshots = [
      snap("2026-07", "a", 100),
      snap("2026-07", "b", 100),
      snap("2026-07", "c", 100),
      snap("2026-08", "a", 100, false),
      snap("2026-08", "b", 100),
      snap("2026-08", "c", 100),
      snap("2026-09", "b", 100, false),
      snap("2026-09", "c", 100),
      snap("2026-10", "c", 100, false),
    ];
    const closes = [close("2026-07"), close("2026-08", 300), close("2026-09", 0), close("2026-10", 0)];
    const plans = [
      plan({
        organizationRegistryId: "fresh",
        startedAt: new Date("2026-10-05T00:00:00.000Z"),
        specialPrice: 100,
        hasPaidInvoice: true,
      }),
    ];

    const hidden = buildCustomerValue({
      endMonth: "2026-08",
      snapshots,
      closes,
      plans,
      arpu: 100,
    });
    expect(hidden.churnedLogos).toBe(1);
    expect(hidden.ltv).toBeNull();
    expect(hidden.ltvCac).toBeNull();

    const shown = buildCustomerValue({
      endMonth: "2026-10",
      snapshots,
      closes,
      plans,
      arpu: 100,
    });
    expect(shown.churnedLogos).toBe(3);
    expect(shown.ltv).not.toBeNull();
    expect(shown.ltvCac).not.toBeNull();
    expect(previousMonthKey("2026-01")).toBe("2025-12");
  });
});
