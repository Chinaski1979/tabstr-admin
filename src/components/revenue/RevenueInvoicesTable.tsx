import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common/StateViews";
import { invoiceOccurredAt } from "@/lib/revenue";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CollectedRevenueInvoice } from "@/types";

interface RevenueInvoicesTableProps {
  invoices: CollectedRevenueInvoice[];
  onSelectOrganization: (orgRegistryId: string) => void;
}

function invoiceStatusVariant(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "paid") return "success" as const;
  if (normalized === "failed") return "destructive" as const;
  return "secondary" as const;
}

export function RevenueInvoicesTable({ invoices, onSelectOrganization }: RevenueInvoicesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
        <CardDescription>
          Card charges recorded in subscription_invoices. Amounts include IVA when the processor
          collected tax.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {invoices.length === 0 ? (
          <EmptyState title="No invoices" description="No subscription invoices on record yet." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const orgId = invoice.organizationRegistryId;
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
                    <TableCell>
                      <Badge variant={invoiceStatusVariant(invoice.status)}>{invoice.status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
