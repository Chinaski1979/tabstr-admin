import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AtRiskReason, BusinessAtRiskCustomer } from "@/types";

interface BusinessAtRiskListProps {
  customers: BusinessAtRiskCustomer[];
  onSelectOrganization: (orgRegistryId: string) => void;
}

const REASON_LABEL: Record<AtRiskReason, string> = {
  past_due: "Past due",
  failed_invoice: "Failed charge",
  unbilled: "No paid invoice",
};

export function BusinessAtRiskList({ customers, onSelectOrganization }: BusinessAtRiskListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>At risk</CardTitle>
        <CardDescription>
          Past-due subscriptions, failed charges this month, and active plans with no paid invoice yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {customers.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            No past-due subscriptions, failed charges, or unbilled plans.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Why</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow
                  key={customer.organizationRegistryId}
                  className="cursor-pointer"
                  onClick={() => onSelectOrganization(customer.organizationRegistryId)}
                >
                  <TableCell className="font-medium">{customer.organizationSlug}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {customer.reasons.map((reason) => (
                        <Badge
                          key={reason}
                          variant={reason === "unbilled" ? "secondary" : "destructive"}
                        >
                          {REASON_LABEL[reason]}
                        </Badge>
                      ))}
                    </div>
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
