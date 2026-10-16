import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { billingIntervalLabel } from "@/types";

interface SubscriptionsTableFiltersProps {
  value: { status: string; frequency: string };
  onChange: (value: { status: string; frequency: string }) => void;
  statuses: string[];
  frequencies: string[];
}

export function SubscriptionsTableFilters({
  value,
  onChange,
  statuses,
  frequencies,
}: SubscriptionsTableFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value.status}
        onValueChange={(status) => onChange({ ...value, status })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {statuses.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.frequency}
        onValueChange={(frequency) => onChange({ ...value, frequency })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Frequency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All frequencies</SelectItem>
          {frequencies.map((frequency) => (
            <SelectItem key={frequency} value={frequency}>
              {billingIntervalLabel(frequency)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
