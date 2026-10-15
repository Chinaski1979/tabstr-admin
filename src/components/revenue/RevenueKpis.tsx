import { Banknote, CreditCard, FileWarning, Layers } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { RevenueOverview, RevenuePeriod } from "@/types";

interface RevenueKpisProps {
  overview: RevenueOverview;
  period: RevenuePeriod;
}

export function RevenueKpis({ overview, period }: RevenueKpisProps) {
  const isYearly = period === "yearly";
  const contracted = isYearly ? overview.yearlyNetProjection : overview.contractedNet;
  const contractedGross = isYearly ? overview.yearlyGrossProjection : overview.contractedGross;
  const collected = isYearly ? overview.collectedThisYear : overview.collectedThisMonth;
  const failed = isYearly ? overview.failedThisYear : overview.failedThisMonth;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {isYearly ? "Contracted yearly" : "Contracted monthly"}
          </CardTitle>
          <Banknote className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="text-2xl font-bold">{formatCurrency(contracted)}</div>
          <p className="text-xs text-muted-foreground">
            ex-IVA
            {isYearly ? " · projection if every special plan stays" : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            Clients pay {formatCurrency(contractedGross)} with 13% IVA
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {isYearly ? "Collected this year" : "Collected this month"}
          </CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="text-2xl font-bold">{formatCurrency(collected)}</div>
          <p className="text-xs text-muted-foreground">card payments, includes IVA</p>
          {failed > 0 ? (
            <p className="text-xs text-destructive">
              {formatCurrency(failed)} failed in this period
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No failed charges in this period</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Special plans</CardTitle>
          <Layers className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="text-2xl font-bold">{overview.contributingPlanCount}</div>
          <p className="text-xs text-muted-foreground">active plans in contracted total</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Unbilled by card</CardTitle>
          <FileWarning className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="text-2xl font-bold">{overview.unbilledPlanCount}</div>
          <p className="text-xs text-muted-foreground">
            special plans with no paid card invoice
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
