import { useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { billingIntervalLabel, type SubscriptionPlan } from "@/types";

import { SubscriptionPlanDialog } from "./SubscriptionPlanDialog";

interface SubscriptionPlanCardProps {
  plan: SubscriptionPlan;
}

export function SubscriptionPlanCard({ plan }: SubscriptionPlanCardProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div className="rounded-lg border p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium">{plan.planName}</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit plan</span>
          </Button>
        </div>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {plan.prices.length === 0 && <li>No prices</li>}
          {plan.prices.map((price) => (
            <li key={price.id}>
              {billingIntervalLabel(price.billingInterval)}:{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(price.planPrice)}
              </span>
              {!price.isActive && (
                <span className="ml-1 text-xs text-muted-foreground">(inactive)</span>
              )}
            </li>
          ))}
        </ul>
        {plan.features.length > 0 && (
          <ul className="mt-3 space-y-1 border-t pt-3 text-sm text-muted-foreground">
            {plan.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        )}
      </div>
      <SubscriptionPlanDialog plan={plan} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
