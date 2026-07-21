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
import { CheckCircle, Clock, XCircle } from "lucide-react";

function subscriptionStatusVariant(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return "success" as const;
  if (s === "past_due") return "warning" as const;
  if (s === "cancelled") return "destructive" as const;
  return "secondary" as const;
}

/** Matches Tabstr BillingHistory / mapInvoiceStatusFromRegistry. */
function mapPaymentStatus(status: string | null | undefined): "paid" | "pending" | "failed" {
  const s = (status ?? "").toLowerCase().trim();
  if (s === "paid") return "paid";
  if (s === "failed") return "failed";
  return "pending";
}

/** Same visual language as Tabstr `getStatusConfig` in BillingHistory.tsx. */
function getPaymentStatusConfig(status: string | null | undefined) {
  switch (mapPaymentStatus(status)) {
    case "paid":
      return {
        label: "Paid",
        variant: "success" as const,
        icon: CheckCircle,
        iconClass: "text-green-500",
      };
    case "pending":
      return {
        label: "Pending",
        variant: "secondary" as const,
        icon: Clock,
        iconClass: "text-yellow-500",
      };
    case "failed":
      return {
        label: "Failed",
        variant: "destructive" as const,
        icon: XCircle,
        iconClass: "text-red-500",
      };
  }
}

/**
 * Hacienda FE status from subscription-electronic-invoice
 * (pending | created | failed) — same badge/icon pattern as payment status.
 */
function getHaciendaInvoiceStatusConfig(status: string | null) {
  const s = (status ?? "").toLowerCase().trim();
  if (s === "created") {
    return {
      label: "Created",
      variant: "success" as const,
      icon: CheckCircle,
      iconClass: "text-green-500",
    };
  }
  if (s === "pending") {
    return {
      label: "Pending",
      variant: "secondary" as const,
      icon: Clock,
      iconClass: "text-yellow-500",
    };
  }
  if (s === "failed") {
    return {
      label: "Failed",
      variant: "destructive" as const,
      icon: XCircle,
      iconClass: "text-red-500",
    };
  }
  return null;
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
                  <TableHead>Invoice status</TableHead>
                  <TableHead>Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const paymentConfig = getPaymentStatusConfig(inv.status);
                  const PaymentIcon = paymentConfig.icon;
                  const haciendaConfig = getHaciendaInvoiceStatusConfig(inv.haciendaStatus);
                  const HaciendaIcon = haciendaConfig?.icon;

                  return (
                    <TableRow key={inv.id}>
                      <TableCell>{formatDate(inv.processedAt ?? inv.createdAt)}</TableCell>
                      <TableCell>{formatCurrency(inv.amount, inv.currency ?? "USD")}</TableCell>
                      <TableCell>
                        <Badge
                          variant={paymentConfig.variant}
                          className="flex w-fit items-center gap-1"
                        >
                          <PaymentIcon className={`h-3 w-3 ${paymentConfig.iconClass}`} />
                          <span>{paymentConfig.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {haciendaConfig && HaciendaIcon ? (
                          <Badge
                            variant={haciendaConfig.variant}
                            className="flex w-fit items-center gap-1"
                            title={inv.haciendaInvoiceId ?? undefined}
                          >
                            <HaciendaIcon className={`h-3 w-3 ${haciendaConfig.iconClass}`} />
                            <span>{haciendaConfig.label}</span>
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {inv.powertranzTransactionId ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
