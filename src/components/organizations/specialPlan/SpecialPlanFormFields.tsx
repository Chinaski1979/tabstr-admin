import { Plus, X } from "lucide-react";
import type { FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import type { FeatureRow, SpecialPlanFormValues } from "./specialPlanForm";

interface SpecialPlanFormFieldsProps {
  formId: string;
  register: UseFormRegister<SpecialPlanFormValues>;
  errors: FieldErrors<SpecialPlanFormValues>;
  isActive: boolean;
  setValue: UseFormSetValue<SpecialPlanFormValues>;
  featureRows: FeatureRow[];
  onUpdateFeature: (key: string, text: string) => void;
  onRemoveFeature: (key: string) => void;
  onAddFeature: () => void;
}

export function SpecialPlanFormFields({
  formId,
  register,
  errors,
  isActive,
  setValue,
  featureRows,
  onUpdateFeature,
  onRemoveFeature,
  onAddFeature,
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
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <Label>Features</Label>
          <span className="text-xs text-muted-foreground">
            Marketing bullets shown on the plan card in the POS.
          </span>
        </div>
        <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
          {featureRows.map((row) => (
            <div key={row.key} className="flex items-center gap-2">
              <Input
                placeholder="e.g. Priority support"
                className="flex-1"
                value={row.text}
                onChange={(e) => onUpdateFeature(row.key, e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                disabled={featureRows.length <= 1}
                onClick={() => onRemoveFeature(row.key)}
                aria-label="Remove feature"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={onAddFeature}>
          <Plus className="h-4 w-4" />
          Add feature
        </Button>
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
