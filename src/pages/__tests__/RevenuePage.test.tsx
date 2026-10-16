import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { buildRevenueOverview } from "@/lib/revenue";
import type { CollectedRevenueInvoice, ContractedRevenuePlan } from "@/types";

const { mockUseRevenue, mockUseRevenueInvoices, mockUseAuth } = vi.hoisted(() => ({
  mockUseRevenue: vi.fn(),
  mockUseRevenueInvoices: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@/hooks/useRevenue", () => ({
  useRevenue: mockUseRevenue,
  useRevenueInvoices: mockUseRevenueInvoices,
  useCreateManualPayment: () => ({ createManualPayment: vi.fn(), isCreating: false }),
  useDeleteManualPayment: () => ({ deleteManualPayment: vi.fn(), isDeleting: false }),
}));

import RevenuePage from "@/pages/RevenuePage";

const NOW = new Date("2026-10-15T12:00:00.000Z");

const plans: ContractedRevenuePlan[] = [
  {
    organizationRegistryId: "org-caravana",
    organizationSlug: "caravana",
    specialPlanName: "Precio Especial Caravana",
    specialPrice: 54,
    startedAt: new Date("2026-08-03T18:46:16.000Z"),
    hasPaidInvoice: false,
  },
  {
    organizationRegistryId: "org-aura",
    organizationSlug: "aura-restaurante",
    specialPlanName: "Early Beta",
    specialPrice: 54,
    startedAt: new Date("2026-07-03T18:58:45.000Z"),
    hasPaidInvoice: false,
  },
];

const octoberInvoice: CollectedRevenueInvoice = {
  id: "inv-1",
  organizationRegistryId: "org-caravana",
  organizationSlug: "caravana",
  amount: 61.02,
  currency: "USD",
  status: "paid",
  paymentMethod: "card",
  recordedBy: null,
  processedAt: "2026-10-04T14:06:41.000Z",
  createdAt: new Date("2026-10-04T14:06:41.000Z"),
};

const septemberInvoice: CollectedRevenueInvoice = {
  id: "inv-sep",
  organizationRegistryId: "org-other",
  organizationSlug: "other-org",
  amount: 40,
  currency: "USD",
  status: "paid",
  paymentMethod: "transfer",
  recordedBy: "admin-1",
  processedAt: "2026-09-04T14:06:41.000Z",
  createdAt: new Date("2026-09-04T14:06:41.000Z"),
};

function renderPage() {
  return render(
    <MemoryRouter>
      <RevenuePage />
    </MemoryRouter>,
  );
}

describe("RevenuePage", () => {
  beforeEach(() => {
    mockUseRevenue.mockReset();
    mockUseRevenueInvoices.mockReset();
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({ isFullAccess: true });
    mockUseRevenueInvoices.mockReturnValue({ invoices: [], isLoading: false, error: null });
  });

  it("shows a loading state", () => {
    mockUseRevenue.mockReturnValue({ overview: null, isLoading: true, error: null });
    renderPage();
    expect(screen.getByText("Revenue")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    mockUseRevenue.mockReturnValue({
      overview: null,
      isLoading: false,
      error: new Error("permission denied"),
    });
    renderPage();
    expect(screen.getByText("Could not load data")).toBeInTheDocument();
    expect(screen.getByText("permission denied")).toBeInTheDocument();
  });

  it("shows an empty state when there is nothing to report", () => {
    mockUseRevenue.mockReturnValue({
      overview: buildRevenueOverview([], [], NOW),
      isLoading: false,
      error: null,
    });
    renderPage();
    expect(screen.getByText("No revenue yet")).toBeInTheDocument();
  });

  it("renders contracted net and collected totals, and scales yearly as × 12", async () => {
    const user = userEvent.setup();
    mockUseRevenue.mockReturnValue({
      overview: buildRevenueOverview(plans, [octoberInvoice, septemberInvoice], NOW),
      isLoading: false,
      error: null,
    });
    mockUseRevenueInvoices.mockReturnValue({
      invoices: [octoberInvoice],
      isLoading: false,
      error: null,
    });
    renderPage();

    expect(screen.getByText("Contracted monthly")).toBeInTheDocument();
    expect(screen.getByText("$108.00")).toBeInTheDocument();
    expect(screen.getByText(/Clients pay \$122\.04 with 13% IVA/)).toBeInTheDocument();
    expect(screen.getByText("Collected this month")).toBeInTheDocument();
    expect(screen.getAllByText("$61.02").length).toBeGreaterThan(0);
    expect(screen.getByText("aura-restaurante")).toBeInTheDocument();
    expect(screen.getAllByText("caravana").length).toBeGreaterThan(0);
    expect(screen.queryByText("other-org")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Invoice month")).toBeInTheDocument();
    expect(
      screen.getByText(/1 organization has an active special plan but no paid invoice/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Yearly" }));

    expect(screen.getByText("Contracted yearly")).toBeInTheDocument();
    expect(screen.getByText("$1,296.00")).toBeInTheDocument();
    expect(screen.getByText("Collected this year")).toBeInTheDocument();
    expect(screen.getByText(/projection if every special plan stays/)).toBeInTheDocument();
  });

  it("hides contracted and collected totals from standard admins", () => {
    mockUseAuth.mockReturnValue({ isFullAccess: false });
    mockUseRevenue.mockReturnValue({
      overview: buildRevenueOverview(plans, [octoberInvoice], NOW),
      isLoading: false,
      error: null,
    });
    mockUseRevenueInvoices.mockReturnValue({
      invoices: [octoberInvoice],
      isLoading: false,
      error: null,
    });
    renderPage();

    expect(screen.queryByText("Contracted monthly")).not.toBeInTheDocument();
    expect(screen.queryByText("Collected this month")).not.toBeInTheDocument();
    expect(screen.queryByText("$108.00")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Yearly" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Special plans").length).toBeGreaterThan(0);
    expect(screen.getByText("Unbilled")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Register payment" })).toBeInTheDocument();
    expect(screen.getAllByText("caravana").length).toBeGreaterThan(0);
  });
});
