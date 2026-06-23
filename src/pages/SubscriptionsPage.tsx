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
import { formatCurrency, formatDate } from "@/lib/utils";
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
        <CardHeader>
          <CardTitle>Plan catalog</CardTitle>
          <CardDescription>Plans defined in the registry.</CardDescription>
        </CardHeader>
        <CardContent>
          {plansLoading && <LoadingState />}
          {!plansLoading && plans.length === 0 && (
            <p className="text-sm text-muted-foreground">No plans defined.</p>
          )}
          {!plansLoading && plans.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const monthly = plan.prices.find((p) => p.billingInterval === "month");
                return (
                  <div key={plan.id} className="rounded-lg border p-4">
                    <p className="font-medium">{plan.planName}</p>
                    <p className="mt-1 text-2xl font-bold">
                      {monthly ? formatCurrency(monthly.planPrice) : "—"}
                      {monthly && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                    </p>
                  </div>
                );
              })}
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
