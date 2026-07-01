import { useNavigate } from "react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateViews";
import { CreateSubscriptionPlanDialog } from "@/components/subscriptions/SubscriptionPlanDialog";
import { SubscriptionPlanCard } from "@/components/subscriptions/SubscriptionPlanCard";
import { formatDate } from "@/lib/utils";
import { useSubscriptionPlans, useAllSubscriptions } from "@/hooks/useSubscriptions";

function statusVariant(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return "success" as const;
  if (s === "past_due") return "warning" as const;
  if (s === "cancelled") return "destructive" as const;
  return "secondary" as const;
}

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const { plans, isLoading: plansLoading } = useSubscriptionPlans();
  const { subscriptions, isLoading, error } = useAllSubscriptions();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Subscriptions"
        description="Plan catalog and active subscriptions across all organizations."
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Plan catalog</CardTitle>
            <CardDescription>Plans defined in the registry.</CardDescription>
          </div>
          <CreateSubscriptionPlanDialog />
        </CardHeader>
        <CardContent>
          {plansLoading && <LoadingState />}

          {!plansLoading && plans.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <SubscriptionPlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscriptions by organization</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <LoadingState />}
          {!isLoading && error && <ErrorState error={error} />}
          {!isLoading && !error && subscriptions.length === 0 && (
            <EmptyState title="No subscriptions" description="No subscriptions on record yet." />
          )}
          {!isLoading && !error && subscriptions.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next charge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow
                    key={sub.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/organizations/${sub.organizationRegistryId}`)}
                  >
                    <TableCell className="font-medium">{sub.organizationSlug}</TableCell>
                    <TableCell>{sub.planName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
                    </TableCell>
                    <TableCell>{sub.frequency ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(sub.nextExecutionDate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
