import type { FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import type { SpecialPlanFormValues } from "./specialPlanForm";

interface SpecialPlanFormFieldsProps {
  formId: string;
  register: UseFormRegister<SpecialPlanFormValues>;
  errors: FieldErrors<SpecialPlanFormValues>;
  isActive: boolean;
  setValue: UseFormSetValue<SpecialPlanFormValues>;
}

export function SpecialPlanFormFields({
  formId,
  register,
  errors,
  isActive,
  setValue,
}: SpecialPlanFormFieldsProps) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${formId}-specialPlanName`}>Plan name</Label>
        <Input
          id={`${formId}-specialPlanName`}
          placeholder="Enterprise custom"
          {...register("specialPlanName")}
        />
        {errors.specialPlanName && (
          <p className="text-xs text-destructive">{errors.specialPlanName.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${formId}-specialPrice`}>Price</Label>
        <Input
          id={`${formId}-specialPrice`}
          type="number"
          min={0}
          step="0.01"
          placeholder="99.00"
          inputMode="decimal"
          {...register("specialPrice")}
        />
        {errors.specialPrice && (
          <p className="text-xs text-destructive">{errors.specialPrice.message}</p>
        )}
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor={`${formId}-isActive`}>Active</Label>
          <span className="text-xs text-muted-foreground">
            Inactive plans cannot be selected for new subscriptions.
          </span>
        </div>
        <Switch
          id={`${formId}-isActive`}
          checked={isActive}
          onCheckedChange={(checked) => setValue("isActive", checked)}
        />
      </div>
    </>
  );
}
