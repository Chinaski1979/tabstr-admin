import { z } from "zod";

import type { BusinessMonthClose } from "@/types";

const money = z.number().min(0, "Must be zero or more");

export const businessCloseFormSchema = z.object({
  cashOnHand: money,
  payroll: money,
  infrastructure: money,
  otherOperating: money,
  salesMarketing: money,
  note: z.string(),
});

export type BusinessCloseFormValues = z.infer<typeof businessCloseFormSchema>;

export function moneyValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export function closeFormValues(close: BusinessMonthClose | undefined): BusinessCloseFormValues {
  return {
    cashOnHand: close?.cashOnHand ?? 0,
    payroll: close?.payroll ?? 0,
    infrastructure: close?.infrastructure ?? 0,
    otherOperating: close?.otherOperating ?? 0,
    salesMarketing: close?.salesMarketing ?? 0,
    note: close?.note ?? "",
  };
}
