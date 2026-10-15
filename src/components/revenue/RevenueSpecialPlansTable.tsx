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
import { applyIva } from "@/lib/revenue";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ContractedRevenuePlan } from "@/types";

interface RevenueSpecialPlansTableProps {
  plans: ContractedRevenuePlan[];
  onSelectOrganization: (orgRegistryId: string) => void;
}

export function RevenueSpecialPlansTable({
  plans,
  onSelectOrganization,
}: RevenueSpecialPlansTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Special plans</CardTitle>
        <CardDescription>
          Contracted net price per organization. The with-IVA column is what a card charge would
          collect, not extra Tabstr revenue.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {plans.length === 0 ? (
          <EmptyState
            title="No special plans"
            description="Active special plans will appear here and make up contracted monthly revenue."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>With 13% IVA</TableHead>
                <TableHead>Since</TableHead>
                <TableHead>Card payments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow
                  key={plan.organizationRegistryId}
                  className="cursor-pointer"
                  onClick={() => onSelectOrganization(plan.organizationRegistryId)}
                >
                  <TableCell className="font-medium">{plan.organizationSlug}</TableCell>
                  <TableCell>{plan.specialPlanName}</TableCell>
                  <TableCell>{formatCurrency(plan.specialPrice)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatCurrency(applyIva(plan.specialPrice))}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(plan.startedAt)}</TableCell>
                  <TableCell>
                    <Badge variant={plan.hasPaidInvoice ? "success" : "secondary"}>
                      {plan.hasPaidInvoice ? "Has paid invoice" : "No paid invoice"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
