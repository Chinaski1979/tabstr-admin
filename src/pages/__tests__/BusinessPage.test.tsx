import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { buildBusinessHealth } from "@/lib/business";
import type { BusinessScorecard, CollectedRevenueInvoice, ContractedRevenuePlan } from "@/types";

const { mockUseBusiness, mockCloseMonth } = vi.hoisted(() => ({
  mockUseBusiness: vi.fn(),
  mockCloseMonth: vi.fn(),
}));

vi.mock("@/hooks/useBusiness", () => ({
  useBusiness: mockUseBusiness,
  useCloseBusinessMonth: () => ({ closeMonth: mockCloseMonth, isClosing: false }),
}));

import BusinessPage from "@/pages/BusinessPage";

const plans: ContractedRevenuePlan[] = [
  {
    organizationRegistryId: "org-1",
    organizationSlug: "acme",
    specialPlanName: "Special",
    specialPrice: 54,
    startedAt: new Date("2026-08-03T00:00:00.000Z"),
    hasPaidInvoice: true,
  },
  {
    organizationRegistryId: "org-2",
    organizationSlug: "beta",
    specialPlanName: "Special",
    specialPrice: 66,
    startedAt: new Date("2026-10-02T00:00:00.000Z"),
    hasPaidInvoice: false,
  },
];

const invoices: CollectedRevenueInvoice[] = [
  {
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
  },
];

function scorecard(): BusinessScorecard {
  return {
    asOfMonth: "2026-10",
    health: buildBusinessHealth({ plans, invoices, subscriptions: [], month: "2026-10" }),
    plans,
    invoices,
    closes: [],
    snapshots: [],
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BusinessPage />
    </MemoryRouter>,
  );
}

describe("BusinessPage", () => {
  beforeEach(() => {
    mockUseBusiness.mockReset();
    mockCloseMonth.mockReset();
    mockCloseMonth.mockResolvedValue(undefined);
  });

  it("shows a loading state", () => {
    mockUseBusiness.mockReturnValue({ scorecard: null, isLoading: true, error: null });
    renderPage();
    expect(screen.getByText("Business")).toBeInTheDocument();
    expect(screen.queryByText("Contracted MRR")).not.toBeInTheDocument();
  });

  it("shows an error state", () => {
    mockUseBusiness.mockReturnValue({
      scorecard: null,
      isLoading: false,
      error: new Error("permission denied"),
    });
    renderPage();
    expect(screen.getByText("Could not load data")).toBeInTheDocument();
    expect(screen.getByText("permission denied")).toBeInTheDocument();
  });

  it("shows live health at special-plan price and explains that retention needs two closes", () => {
    mockUseBusiness.mockReturnValue({ scorecard: scorecard(), isLoading: false, error: null });
    renderPage();

    expect(screen.getByText("Contracted MRR")).toBeInTheDocument();
    expect(screen.getByText("$120.00")).toBeInTheDocument();
    expect(screen.getByText("$1,440.00")).toBeInTheDocument();
    expect(screen.getByText("$60.00")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 active plans paid this month")).toBeInTheDocument();
    expect(screen.getByText("beta")).toBeInTheDocument();
    expect(screen.getByText("No paid invoice")).toBeInTheDocument();
    expect(
      screen.getByText(/Close two consecutive months to see churn, GRR, and NRR/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Catalog subscription plans are not included/)).toBeInTheDocument();
  });

  it("closes the selected month with the amounts entered", async () => {
    const user = userEvent.setup();
    mockUseBusiness.mockReturnValue({ scorecard: scorecard(), isLoading: false, error: null });
    renderPage();

    await user.clear(screen.getByLabelText("Cash on hand"));
    await user.type(screen.getByLabelText("Cash on hand"), "10000");
    await user.clear(screen.getByLabelText("Payroll"));
    await user.type(screen.getByLabelText("Payroll"), "3000");
    await user.click(screen.getByRole("button", { name: "Close month" }));

    expect(mockCloseMonth).toHaveBeenCalledWith(
      expect.objectContaining({
        month: "2026-10",
        cashOnHand: 10000,
        payroll: 3000,
      }),
    );
  });
});
