import { z } from "zod";

import type { InvoicePaymentMethod } from "@/types";

export const PAYMENT_METHOD_OPTIONS = [
  { value: "transfer" as const, label: "Transfer" },
  { value: "card" as const, label: "Card" },
];

export const registerPaymentFormSchema = z.object({
  organizationRegistryId: z.string().min(1, "Choose an organization"),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required"),
  paymentMethod: z.enum(["card", "transfer"]),
});

export type RegisterPaymentFormValues = z.infer<typeof registerPaymentFormSchema>;

export function localDateInputValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function defaultRegisterPaymentValues(
  organizationRegistryId?: string,
): RegisterPaymentFormValues {
  return {
    organizationRegistryId: organizationRegistryId ?? "",
    paidOn: localDateInputValue(),
    paymentMethod: "transfer",
  };
}

export function paymentMethodFromForm(value: string): InvoicePaymentMethod {
  return value === "card" ? "card" : "transfer";
}
