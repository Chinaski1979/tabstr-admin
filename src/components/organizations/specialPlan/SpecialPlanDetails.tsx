import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { OrganizationSpecialPlan } from "@/types";

interface SpecialPlanDetailsProps {
  plan: OrganizationSpecialPlan;
}

export function SpecialPlanDetails({ plan }: SpecialPlanDetailsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Detail label="Plan name" value={plan.specialPlanName} />
        <Detail label="Price" value={formatCurrency(plan.specialPrice)} />
        <Detail
          label="Status"
          value={
            <Badge variant={plan.isActive ? "success" : "secondary"}>
              {plan.isActive ? "Active" : "Inactive"}
            </Badge>
          }
        />
      </div>
      {plan.features.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Features</span>
          <ul className="space-y-1 text-sm font-medium">
            {plan.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
