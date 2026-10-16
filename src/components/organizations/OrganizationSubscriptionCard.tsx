import { useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateViews";
import { RegisterPaymentDialog } from "@/components/revenue/RegisterPaymentDialog";
import { useDeleteManualPayment } from "@/hooks/useRevenue";
import {
  useOrganizationInvoices,
  useOrganizationSpecialPlan,
  useOrganizationSubscription,
} from "@/hooks/useSubscriptions";
import { isManualInvoice, paymentMethodLabel } from "@/lib/revenue";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CollectedRevenueInvoice, ContractedRevenuePlan, SubscriptionInvoice } from "@/types";

interface OrganizationSubscriptionCardProps {
  orgRegistryId: string;
  organizationSlug: string;
}

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

function toCollectedInvoice(
  invoice: SubscriptionInvoice,
  organizationSlug: string,
  orgRegistryId: string,
): CollectedRevenueInvoice {
  return {
    id: invoice.id,
    organizationRegistryId: invoice.organizationRegistryId ?? orgRegistryId,
    organizationSlug,
    amount: invoice.amount,
    currency: invoice.currency,
    status: invoice.status,
    paymentMethod: invoice.paymentMethod,
    recordedBy: invoice.recordedBy,
    processedAt: invoice.processedAt,
    createdAt: invoice.createdAt,
  };
}

export function OrganizationSubscriptionCard({
  orgRegistryId,
  organizationSlug,
}: OrganizationSubscriptionCardProps) {
  const { subscription, isLoading, error } = useOrganizationSubscription(orgRegistryId);
  const { invoices, isLoading: invoicesLoading } = useOrganizationInvoices(orgRegistryId);
  const { specialPlan } = useOrganizationSpecialPlan(orgRegistryId);
  const { deleteManualPayment, isDeleting } = useDeleteManualPayment();
  const [pendingDelete, setPendingDelete] = useState<SubscriptionInvoice | null>(null);

  const paymentPlans: ContractedRevenuePlan[] = useMemo(() => {
    if (!specialPlan?.isActive) return [];
    return [
      {
        organizationRegistryId: orgRegistryId,
        organizationSlug,
        specialPlanName: specialPlan.specialPlanName,
        specialPrice: specialPlan.specialPrice,
        startedAt: new Date(),
        hasPaidInvoice: invoices.some((invoice) => invoice.status.toLowerCase() === "paid"),
      },
    ];
  }, [invoices, orgRegistryId, organizationSlug, specialPlan]);

  const collectedInvoices = useMemo(
    () => invoices.map((invoice) => toCollectedInvoice(invoice, organizationSlug, orgRegistryId)),
    [invoices, orgRegistryId, organizationSlug],
  );

  const onConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteManualPayment({
        invoiceId: pendingDelete.id,
        organizationRegistryId: orgRegistryId,
      });
      setPendingDelete(null);
    } catch {
      // Error toast handled in the hook.
    }
  };

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Current plan and billing history from the registry.</CardDescription>
        </div>
        {paymentPlans.length > 0 ? (
          <RegisterPaymentDialog
            plans={paymentPlans}
            invoices={collectedInvoices}
            organizationRegistryId={orgRegistryId}
            triggerSize="sm"
          />
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} />
        ) : !subscription ? (
          <EmptyState title="No subscription" description="This organization has no subscription on record." />
        ) : (
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
          {invoicesLoading ? (
            <LoadingState />
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{formatDate(inv.processedAt ?? inv.createdAt)}</TableCell>
                    <TableCell>{formatCurrency(inv.amount, inv.currency ?? "USD")}</TableCell>
                    <TableCell>{paymentMethodLabel(inv.paymentMethod)}</TableCell>
                    <TableCell>
                      <Badge variant={invoiceStatusVariant(inv.status)}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {inv.powertranzTransactionId ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {isManualInvoice(inv) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove payment"
                          onClick={() => setPendingDelete(inv)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              Only manually recorded payments can be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
