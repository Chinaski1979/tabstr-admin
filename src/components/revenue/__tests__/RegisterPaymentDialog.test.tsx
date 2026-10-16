import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CollectedRevenueInvoice, ContractedRevenuePlan } from "@/types";

const { mockCreateManualPayment } = vi.hoisted(() => ({
  mockCreateManualPayment: vi.fn(),
}));

vi.mock("@/hooks/useRevenue", () => ({
  useCreateManualPayment: () => ({
    createManualPayment: mockCreateManualPayment,
    isCreating: false,
  }),
}));

import { RegisterPaymentDialog } from "@/components/revenue/RegisterPaymentDialog";

const plans: ContractedRevenuePlan[] = [
  {
    organizationRegistryId: "org-aura",
    organizationSlug: "aura-restaurante",
    specialPlanName: "Early Beta",
    specialPrice: 54,
    startedAt: new Date("2026-07-03T18:58:45.000Z"),
    hasPaidInvoice: false,
  },
];

const paidThisMonth: CollectedRevenueInvoice[] = [
  {
    id: "inv-1",
    organizationRegistryId: "org-aura",
    organizationSlug: "aura-restaurante",
    amount: 54,
    currency: "USD",
    status: "paid",
    paymentMethod: "transfer",
    recordedBy: "admin-1",
    processedAt: "2026-10-04T12:00:00.000Z",
    createdAt: new Date("2026-10-04T12:00:00.000Z"),
  },
];

describe("RegisterPaymentDialog", () => {
  beforeEach(() => {
    mockCreateManualPayment.mockReset();
    mockCreateManualPayment.mockResolvedValue({});
  });

  it("shows the special-plan amount and submits without an amount field", async () => {
    const user = userEvent.setup();
    render(<RegisterPaymentDialog plans={plans} invoices={[]} organizationRegistryId="org-aura" />);

    await user.click(screen.getByRole("button", { name: "Register payment" }));

    expect(
      screen.getByText(/Amount: \$54\.00 \(from the special plan, ex-IVA\)/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Amount")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save payment" }));

    expect(mockCreateManualPayment).toHaveBeenCalledTimes(1);
    const payload = mockCreateManualPayment.mock.calls[0][0];
    expect(payload.organizationRegistryId).toBe("org-aura");
    expect(payload.paymentMethod).toBe("transfer");
    expect(payload.paidOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload).not.toHaveProperty("amount");
  });

  it("warns when the organization already has a paid invoice in that month", async () => {
    const user = userEvent.setup();
    render(
      <RegisterPaymentDialog
        plans={plans}
        invoices={paidThisMonth}
        organizationRegistryId="org-aura"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Register payment" }));

    const dateInput = screen.getByLabelText("Paid on") as HTMLInputElement;
    await user.clear(dateInput);
    await user.type(dateInput, "2026-10-15");

    expect(
      screen.getByText(/already has a paid invoice in that month/),
    ).toBeInTheDocument();
  });
});
