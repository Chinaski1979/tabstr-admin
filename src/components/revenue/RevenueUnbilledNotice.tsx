import { Card, CardContent } from "@/components/ui/card";
import type { ContractedRevenuePlan } from "@/types";

interface RevenueUnbilledNoticeProps {
  plans: ContractedRevenuePlan[];
}

export function RevenueUnbilledNotice({ plans }: RevenueUnbilledNoticeProps) {
  const unbilled = plans.filter((plan) => !plan.hasPaidInvoice);
  if (unbilled.length === 0) return null;

  const slugs = unbilled.map((plan) => plan.organizationSlug).join(", ");

  return (
    <Card>
      <CardContent className="pt-6 text-sm text-muted-foreground">
        {unbilled.length === 1 ? "1 organization has" : `${unbilled.length} organizations have`} an
        active special plan but no paid invoice ({slugs}). Register a transfer (or card) payment so
        they count toward collected history.
      </CardContent>
    </Card>
  );
}
