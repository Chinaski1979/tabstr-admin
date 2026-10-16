import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { EmptyState, ErrorState, LoadingState } from "@/components/common/StateViews";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeleteManualPayment } from "@/hooks/useRevenue";
import { formatMonthLabel, invoiceOccurredAt, isManualInvoice, paymentMethodLabel } from "@/lib/revenue";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CollectedRevenueInvoice } from "@/types";

interface RevenueInvoicesTableProps {
  invoices: CollectedRevenueInvoice[];
  month: string;
  monthOptions: string[];
  isLoading: boolean;
  error: Error | null;
  onMonthChange: (month: string) => void;
  onSelectOrganization: (orgRegistryId: string) => void;
}

function invoiceStatusVariant(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "paid") return "success" as const;
  if (normalized === "failed") return "destructive" as const;
  return "secondary" as const;
}

export function RevenueInvoicesTable({
  invoices,
  month,
  monthOptions,
  isLoading,
  error,
  onMonthChange,
  onSelectOrganization,
}: RevenueInvoicesTableProps) {
  const { deleteManualPayment, isDeleting } = useDeleteManualPayment();
  const [pendingDelete, setPendingDelete] = useState<CollectedRevenueInvoice | null>(null);
  const monthLabel = formatMonthLabel(month);

  const onConfirmDelete = async () => {
    if (!pendingDelete?.organizationRegistryId) return;
    try {
      await deleteManualPayment({
        invoiceId: pendingDelete.id,
        organizationRegistryId: pendingDelete.organizationRegistryId,
      });
      setPendingDelete(null);
    } catch {
      // Error toast handled in the hook.
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            Paid and failed invoices for {monthLabel}. Card charges from PowerTranz may include IVA;
            manually recorded transfers use the special-plan price.
          </CardDescription>
        </div>
        <Select value={month} onValueChange={onMonthChange}>
          <SelectTrigger className="w-[160px]" aria-label="Invoice month">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {formatMonthLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} />
        ) : invoices.length === 0 ? (
          <EmptyState
            title={`No invoices in ${monthLabel}`}
            description="No subscription invoices for this month."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const orgId = invoice.organizationRegistryId;
                const manual = isManualInvoice(invoice);
                return (
                  <TableRow
                    key={invoice.id}
                    className={orgId ? "cursor-pointer" : undefined}
                    onClick={orgId ? () => onSelectOrganization(orgId) : undefined}
                  >
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoiceOccurredAt(invoice))}
                    </TableCell>
                    <TableCell className="font-medium">{invoice.organizationSlug ?? "—"}</TableCell>
                    <TableCell>{formatCurrency(invoice.amount, invoice.currency ?? "USD")}</TableCell>
                    <TableCell>{paymentMethodLabel(invoice.paymentMethod)}</TableCell>
                    <TableCell>
                      <Badge variant={invoiceStatusVariant(invoice.status)}>{invoice.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      {manual ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove payment"
                          onClick={() => setPendingDelete(invoice)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              Only manually recorded payments can be removed. PowerTranz card charges stay as they
              are.
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
    </Card>
  );
}
