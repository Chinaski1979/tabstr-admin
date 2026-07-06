import { useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateViews";
import { useOrganizationSpecialPlan } from "@/hooks/useSubscriptions";

import { SpecialPlanDetails } from "./SpecialPlanDetails";
import { SpecialPlanDialog } from "./SpecialPlanDialog";

export function OrganizationSpecialPlanCard({ orgRegistryId }: { orgRegistryId: string }) {
  const { specialPlan, isLoading, error } = useOrganizationSpecialPlan(orgRegistryId);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Special plan</CardTitle>
            <CardDescription>
              Custom pricing for this organization, separate from the global plan catalog.
            </CardDescription>
          </div>
          {!isLoading && !error && !specialPlan && (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create special plan
            </Button>
          )}
          {!isLoading && !error && specialPlan && (
            <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading && <LoadingState />}
          {!isLoading && error && <ErrorState error={error} />}
          {!isLoading && !error && !specialPlan && (
            <EmptyState
              title="No special plan"
              description="Create a custom plan to assign negotiated pricing to this organization."
            />
          )}
          {!isLoading && !error && specialPlan && <SpecialPlanDetails plan={specialPlan} />}
        </CardContent>
      </Card>

      <SpecialPlanDialog
        orgRegistryId={orgRegistryId}
        plan={specialPlan ?? undefined}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
