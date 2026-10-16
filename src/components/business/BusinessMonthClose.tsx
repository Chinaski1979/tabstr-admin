import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  businessCloseFormSchema,
  closeFormValues,
  moneyValue,
  type BusinessCloseFormValues,
} from "@/components/business/businessCloseForm";
import { buildBurn, collectedInMonth, countNewLogos, formatRunway } from "@/lib/business";
import { formatMonthLabel } from "@/lib/revenue";
import { formatCurrency, formatDate } from "@/lib/utils";
import type {
  BusinessMonthClose as BusinessMonthCloseRow,
  CloseBusinessMonthInput,
  CollectedRevenueInvoice,
  ContractedRevenuePlan,
} from "@/types";

interface BusinessMonthCloseProps {
  month: string;
  plans: ContractedRevenuePlan[];
  invoices: CollectedRevenueInvoice[];
  closes: BusinessMonthCloseRow[];
  isClosing: boolean;
  onMonthChange: (month: string) => void;
  onCloseMonth: (input: CloseBusinessMonthInput) => Promise<void>;
}

const FIELDS: { name: Exclude<keyof BusinessCloseFormValues, "note">; label: string; hint: string }[] = [
  { name: "cashOnHand", label: "Cash on hand", hint: "Bank balance at month end" },
  { name: "payroll", label: "Payroll", hint: "Salaries and contractors" },
  { name: "infrastructure", label: "Infrastructure", hint: "Hosting, Supabase, and tools" },
  { name: "otherOperating", label: "Other operating", hint: "Everything else that is not sales" },
  { name: "salesMarketing", label: "Sales and marketing", hint: "Blended. Used for CAC" },
];

export function BusinessMonthClose({
  month,
  plans,
  invoices,
  closes,
  isClosing,
  onMonthChange,
  onCloseMonth,
}: BusinessMonthCloseProps) {
  const saved = closes.find((close) => close.month === month);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BusinessCloseFormValues>({
    resolver: zodResolver(businessCloseFormSchema),
    defaultValues: closeFormValues(saved),
  });

  const values = watch();
  const collected = collectedInMonth(invoices, month);
  const newLogos = countNewLogos(plans, month);
  const burn = buildBurn({
    cashOnHand: moneyValue(values.cashOnHand),
    payroll: moneyValue(values.payroll),
    infrastructure: moneyValue(values.infrastructure),
    otherOperating: moneyValue(values.otherOperating),
    salesMarketing: moneyValue(values.salesMarketing),
    collected,
    newLogos,
  });

  const onSubmit = async (form: BusinessCloseFormValues) => {
    try {
      await onCloseMonth({
        month,
        cashOnHand: form.cashOnHand,
        payroll: form.payroll,
        infrastructure: form.infrastructure,
        otherOperating: form.otherOperating,
        salesMarketing: form.salesMarketing,
        note: form.note,
      });
    } catch {
      // Toast is handled in the hook.
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly close</CardTitle>
        <CardDescription>
          Cash and spending for {formatMonthLabel(month)}. Collected cash comes from paid invoices at
          the special-plan price, so transfers are not entered again.
          {saved?.closedAt ? ` Last closed ${formatDate(saved.closedAt)}.` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <Label htmlFor="business-month">Month</Label>
            <Input
              id="business-month"
              type="month"
              value={month}
              onChange={(event) => {
                if (/^\d{4}-\d{2}$/.test(event.target.value)) onMonthChange(event.target.value);
              }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.name} className="flex flex-col gap-1.5">
                <Label htmlFor={`business-${field.name}`}>{field.label}</Label>
                <Input
                  id={`business-${field.name}`}
                  type="number"
                  min={0}
                  step="0.01"
                  {...register(field.name, { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">{field.hint}</p>
                {errors[field.name] && (
                  <p className="text-xs text-destructive">{errors[field.name]?.message}</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="business-note">Note</Label>
            <Textarea id="business-note" rows={3} {...register("note")} />
          </div>

          <dl className="grid gap-3 rounded-md border p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Gross burn" value={formatCurrency(burn.grossBurn)} />
            <Metric label="Collected" value={formatCurrency(collected)} />
            <Metric
              label="Net burn"
              value={burn.cashflowPositive ? "Cashflow positive" : formatCurrency(burn.netBurn)}
            />
            <Metric
              label="Runway"
              value={burn.runwayMonths == null ? "—" : formatRunway(burn.runwayMonths)}
            />
            <Metric label="New logos" value={String(newLogos)} />
            <Metric
              label="Blended CAC"
              value={burn.blendedCac == null ? "—" : formatCurrency(burn.blendedCac)}
            />
          </dl>

          <div>
            <Button type="submit" disabled={isClosing}>
              {isClosing && <Loader2 className="h-4 w-4 animate-spin" />}
              {saved?.closedAt ? "Update close" : "Close month"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
