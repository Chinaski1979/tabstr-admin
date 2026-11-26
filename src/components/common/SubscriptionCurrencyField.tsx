import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUBSCRIPTION_CURRENCY_OPTIONS, type SubscriptionCurrency } from "@/types";

interface SubscriptionCurrencyFieldProps {
  id: string;
  value: SubscriptionCurrency;
  onChange: (value: SubscriptionCurrency) => void;
  /** Currency the plan had before editing. Shows a warning when it changes. */
  savedCurrency?: SubscriptionCurrency;
}

/**
 * Currency the plan is charged in through PowerTranz (CRC = 188, USD = 840).
 * Active recurring subscriptions keep the currency and amount of their first charge.
 */
export function SubscriptionCurrencyField({
  id,
  value,
  onChange,
  savedCurrency,
}: SubscriptionCurrencyFieldProps) {
  const changed = savedCurrency != null && savedCurrency !== value;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Currency</Label>
      <Select value={value} onValueChange={(next) => onChange(next as SubscriptionCurrency)}>
        <SelectTrigger id={id} className="sm:max-w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUBSCRIPTION_CURRENCY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {changed ? (
        <p className="text-xs text-amber-600" role="alert">
          Active subscriptions keep charging in {savedCurrency} at their current amount until the
          client subscribes again. Only new checkouts use {value}.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          The card is charged in this currency. Enter the price in {value}.
        </p>
      )}
    </div>
  );
}
