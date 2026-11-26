import { z } from "zod";

import { DEFAULT_SUBSCRIPTION_CURRENCY, type OrganizationSpecialPlan } from "@/types";

export type FeatureRow = {
  key: string;
  text: string;
};

export const specialPlanFormSchema = z.object({
  specialPlanName: z.string().min(1, "Plan name is required"),
  specialPrice: z
    .string()
    .min(1, "Price is required")
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, {
      message: "Price must be 0 or greater",
    }),
  currency: z.enum(["USD", "CRC"]),
  isActive: z.boolean(),
});

export type SpecialPlanFormValues = z.infer<typeof specialPlanFormSchema>;

export function newFeatureRow(text = ""): FeatureRow {
  return { key: crypto.randomUUID(), text };
}

export function featureRowsFromPlan(plan?: OrganizationSpecialPlan): FeatureRow[] {
  if (!plan?.features.length) return [newFeatureRow()];
  return plan.features.map((text) => newFeatureRow(text));
}

export function parseFeatureRows(rows: FeatureRow[]): string[] {
  return rows.map((row) => row.text.trim()).filter(Boolean);
}

export function defaultFormValues(plan?: OrganizationSpecialPlan): SpecialPlanFormValues {
  return {
    specialPlanName: plan?.specialPlanName ?? "",
    specialPrice: plan ? String(plan.specialPrice) : "",
    currency: plan?.currency ?? DEFAULT_SUBSCRIPTION_CURRENCY,
    isActive: plan?.isActive ?? true,
  };
}

export function specialPlanInputFromForm(
  values: SpecialPlanFormValues,
  featureRows: FeatureRow[],
) {
  return {
    specialPlanName: values.specialPlanName.trim(),
    specialPrice: Number(values.specialPrice),
    currency: values.currency,
    isActive: values.isActive,
    features: parseFeatureRows(featureRows),
  };
}
