import { AlertTriangle, Banknote, CalendarRange, Percent, UserPlus, Users, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRate } from "@/lib/business";
import { formatCurrency } from "@/lib/utils";
import type { BusinessHealth } from "@/types";

interface BusinessKpisProps {
  health: BusinessHealth;
}

export function BusinessKpis({ health }: BusinessKpisProps) {
  const cards = [
    {
      label: "Contracted MRR",
      value: formatCurrency(health.contractedMrr),
      detail: "Active special-plan prices, ex-IVA",
      icon: Banknote,
    },
    {
      label: "ARR projection",
      value: formatCurrency(health.arrProjection),
      detail: "MRR × 12 if every current plan stays",
      icon: CalendarRange,
    },
    {
      label: "Active customers",
      value: String(health.activeCustomers),
      detail: "Organizations with an active special plan",
      icon: Users,
    },
    {
      label: "ARPU",
      value: health.arpu == null ? "—" : formatCurrency(health.arpu),
      detail: "Contracted MRR / active customers",
      icon: Wallet,
    },
    {
      label: "New logos",
      value: String(health.newLogos),
      detail: "Active special plans that started this month",
      icon: UserPlus,
    },
    {
      label: "Collected",
      value: formatCurrency(health.collected),
      detail: "Special-plan price. PowerTranz charges are counted without 13% IVA",
      icon: Banknote,
    },
    {
      label: "Collection",
      value: health.collectionRate == null ? "—" : formatRate(health.collectionRate),
      detail:
        health.activeCustomers === 0
          ? "No active special plans"
          : `${health.paidCustomers} of ${health.activeCustomers} active plans paid this month`,
      icon: Percent,
    },
    {
      label: "At risk",
      value: String(health.atRisk.length),
      detail: "Past due, a failed charge this month, or never paid",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Catalog subscription plans are not included in contracted MRR. Only active special plans are.
      </p>
    </div>
  );
}
