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

import type { PlanFormValues, PriceRow } from "./subscriptionPlanForm";

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

      <div className="flex items-center justify-between rounded-md border px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor={`${formId}-isActive`}>Active prices</Label>
          <span className="text-xs text-muted-foreground">
            When off, these prices are hidden from checkout flows.
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
