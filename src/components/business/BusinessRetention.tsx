import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRate } from "@/lib/business";
import { formatMonthLabel } from "@/lib/revenue";
import { formatCurrency } from "@/lib/utils";
import type { CustomerValue, RetentionMovement } from "@/types";

interface BusinessRetentionProps {
  month: string;
  previousMonth: string;
  selectedClosed: boolean;
  previousClosed: boolean;
  movement: RetentionMovement | null;
  customerValue: CustomerValue;
}

export function BusinessRetention({
  month,
  previousMonth,
  selectedClosed,
  previousClosed,
  movement,
  customerValue,
}: BusinessRetentionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Retention</CardTitle>
        <CardDescription>
          Compared with {formatMonthLabel(previousMonth)}. Rates use the special-plan prices saved
          when each month was closed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!movement ? (
          <p className="text-sm text-muted-foreground">{waitingCopy(month, previousMonth, selectedClosed, previousClosed)}</p>
        ) : (
          <>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Starting MRR" value={formatCurrency(movement.startingMrr)} />
              <Metric label="New MRR" value={formatCurrency(movement.newMrr)} />
              <Metric label="Expansion" value={formatCurrency(movement.expansionMrr)} />
              <Metric label="Contraction" value={formatCurrency(movement.contractionMrr)} />
              <Metric label="Churned MRR" value={formatCurrency(movement.churnedMrr)} />
              <Metric
                label="Logo churn"
                value={
                  movement.logoChurnRate == null
                    ? "—"
                    : `${formatRate(movement.logoChurnRate)} · ${movement.churnedLogos} of ${movement.startingLogos}`
                }
              />
              <Metric label="GRR" value={movement.grr == null ? "—" : formatRate(movement.grr)} />
              <Metric label="NRR" value={movement.nrr == null ? "—" : formatRate(movement.nrr)} />
            </dl>
            {customerValue.ltv == null ? (
              <p className="text-sm text-muted-foreground">
                LTV stays hidden until 3 customers churn across the last 3 closed months (
                {customerValue.churnedLogos} so far).
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">LTV {formatCurrency(customerValue.ltv)}</p>
                <p className="text-xs text-muted-foreground">
                  ARPU / average monthly logo churn · {customerValue.churnedLogos} churned logos over{" "}
                  {customerValue.monthsUsed} months
                </p>
                {customerValue.ltvCac != null && (
                  <p className="text-sm text-muted-foreground">
                    LTV:CAC {customerValue.ltvCac.toFixed(1)} · LTV / blended CAC over the same months
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function waitingCopy(
  month: string,
  previousMonth: string,
  selectedClosed: boolean,
  previousClosed: boolean,
): string {
  if (!selectedClosed && !previousClosed) {
    return "Close two consecutive months to see churn, GRR, and NRR. History starts with the first close.";
  }
  if (!selectedClosed) {
    return `Close ${formatMonthLabel(month)} to compare it with ${formatMonthLabel(previousMonth)}.`;
  }
  return `Close ${formatMonthLabel(previousMonth)} as well. Retention starts the month after the first snapshot.`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
