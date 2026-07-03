import { z } from "zod";

import type { OrganizationSpecialPlan } from "@/types";

export const specialPlanFormSchema = z.object({
  specialPlanName: z.string().min(1, "Plan name is required"),
  specialPrice: z
    .string()
    .min(1, "Price is required")
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, {
      message: "Price must be 0 or greater",
    }),
  isActive: z.boolean(),
});

export type SpecialPlanFormValues = z.infer<typeof specialPlanFormSchema>;

export function defaultFormValues(plan?: OrganizationSpecialPlan): SpecialPlanFormValues {
  return {
    specialPlanName: plan?.specialPlanName ?? "",
    specialPrice: plan ? String(plan.specialPrice) : "",
    isActive: plan?.isActive ?? true,
  };
}

export function specialPlanInputFromForm(values: SpecialPlanFormValues) {
  return {
    specialPlanName: values.specialPlanName.trim(),
    specialPrice: Number(values.specialPrice),
    isActive: values.isActive,
  };
}
