import { Plus, X } from "lucide-react";
import type { UseFormRegister, FieldErrors, UseFormSetValue } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BILLING_INTERVAL_OPTIONS, type BillingInterval } from "@/types";

import type { FeatureRow, PlanFormValues, PriceRow } from "./subscriptionPlanForm";

type IntervalOption = (typeof BILLING_INTERVAL_OPTIONS)[number];

interface SubscriptionPlanFormFieldsProps {
  formId: string;
  register: UseFormRegister<PlanFormValues>;
  errors: FieldErrors<PlanFormValues>;
  isActive: boolean;
  setValue: UseFormSetValue<PlanFormValues>;
  priceRows: PriceRow[];
  intervalsError: string | null;
  canAddRow: boolean;
  optionsForRow: (row: PriceRow) => IntervalOption[];
  onUpdateRow: (key: string, patch: Partial<PriceRow>) => void;
  onRemoveRow: (key: string) => void;
  onAddRow: () => void;
  featureRows: FeatureRow[];
  onUpdateFeature: (key: string, text: string) => void;
  onRemoveFeature: (key: string) => void;
  onAddFeature: () => void;
}

export function SubscriptionPlanFormFields({
  formId,
  register,
  errors,
  isActive,
  setValue,
  priceRows,
  intervalsError,
  canAddRow,
  optionsForRow,
  onUpdateRow,
  onRemoveRow,
  onAddRow,
  featureRows,
  onUpdateFeature,
  onRemoveFeature,
  onAddFeature,
}: SubscriptionPlanFormFieldsProps) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${formId}-planName`}>Plan name</Label>
        <Input id={`${formId}-planName`} placeholder="Pro" {...register("planName")} />
        {errors.planName && (
          <p className="text-xs text-destructive">{errors.planName.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Billing intervals</Label>
        <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
          {priceRows.map((row) => (
            <div key={row.key} className="flex items-center gap-2">
              <Select
                value={row.interval || undefined}
                onValueChange={(value) =>
                  onUpdateRow(row.key, { interval: value as BillingInterval })
                }
              >
                <SelectTrigger className="w-[140px] shrink-0">
                  <SelectValue placeholder="Interval" />
                </SelectTrigger>
                <SelectContent>
                  {optionsForRow(row).map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Price"
                className="flex-1"
                value={row.price}
                onChange={(e) => onUpdateRow(row.key, { price: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                disabled={priceRows.length <= 1}
                onClick={() => onRemoveRow(row.key)}
                aria-label="Remove interval"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={!canAddRow}
          onClick={onAddRow}
        >
          <Plus className="h-4 w-4" />
          Add interval
        </Button>
        {intervalsError && <p className="text-xs text-destructive">{intervalsError}</p>}
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
                placeholder="e.g. Digital invoices"
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

      <div className="flex items-center justify-between rounded-md border px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor={`${formId}-isActive`}>Active</Label>
          <span className="text-xs text-muted-foreground">
            When off, this plan is not offered as an option in the POS.
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
