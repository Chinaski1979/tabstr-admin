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
import {
  useOrganizationInvoices,
  useOrganizationSubscription,
} from "@/hooks/useSubscriptions";

function subscriptionStatusVariant(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return "success" as const;
  if (s === "past_due") return "warning" as const;
  if (s === "cancelled") return "destructive" as const;
  return "secondary" as const;
}

function invoiceStatusVariant(status: string) {
  const s = status.toLowerCase();
  if (s === "paid") return "success" as const;
  if (s === "failed") return "destructive" as const;
  return "secondary" as const;
}

export function OrganizationSubscriptionCard({ orgRegistryId }: { orgRegistryId: string }) {
  const { subscription, isLoading, error } = useOrganizationSubscription(orgRegistryId);
  const { invoices, isLoading: invoicesLoading } = useOrganizationInvoices(orgRegistryId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>Current plan and billing history from the registry.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {isLoading && <LoadingState />}
        {!isLoading && error && <ErrorState error={error} />}
        {!isLoading && !error && !subscription && (
          <EmptyState title="No subscription" description="This organization has no subscription on record." />
        )}
        {!isLoading && !error && subscription && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Detail label="Plan" value={subscription.planName ?? "—"} />
            <Detail
              label="Status"
              value={
                <Badge variant={subscriptionStatusVariant(subscription.status)}>
                  {subscription.status}
                </Badge>
              }
            />
            <Detail label="Frequency" value={subscription.frequency ?? "—"} />
            <Detail label="Next charge" value={formatDate(subscription.nextExecutionDate)} />
          </div>
        )}

        <div>
          <h3 className="mb-2 text-sm font-medium">Billing history</h3>
          {invoicesLoading && <LoadingState />}
          {!invoicesLoading && invoices.length === 0 && (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          )}
          {!invoicesLoading && invoices.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{formatDate(inv.processedAt ?? inv.createdAt)}</TableCell>
                    <TableCell>{formatCurrency(inv.amount, inv.currency ?? "USD")}</TableCell>
                    <TableCell>
                      <Badge variant={invoiceStatusVariant(inv.status)}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {inv.powertranzTransactionId ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
