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
import { formatMonthLabel } from "@/lib/revenue";
import { formatCurrency } from "@/lib/utils";
import type { CollectedRevenueMonth } from "@/types";

interface RevenueCollectedByMonthProps {
  months: CollectedRevenueMonth[];
}

export function RevenueCollectedByMonth({ months }: RevenueCollectedByMonthProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Collected by month</CardTitle>
        <CardDescription>
          Paid invoices from the registry (card and transfer). Card amounts may include IVA;
          transfers are recorded at the special-plan price.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {months.length === 0 ? (
          <EmptyState
            title="No invoices"
            description="Paid and failed charges will show here once they land in subscription_invoices."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Paid count</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Failed count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((row) => (
                <TableRow key={row.month}>
                  <TableCell className="font-medium">{formatMonthLabel(row.month)}</TableCell>
                  <TableCell>{formatCurrency(row.paidTotal)}</TableCell>
                  <TableCell className="text-muted-foreground">{row.paidCount}</TableCell>
                  <TableCell className={row.failedTotal > 0 ? "text-destructive" : undefined}>
                    {formatCurrency(row.failedTotal)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.failedCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
