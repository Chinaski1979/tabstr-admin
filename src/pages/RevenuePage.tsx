import { LineChart } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Full-access-only placeholder. Revenue analytics (MRR, churn, subscription
 * revenue) will be built here. The route is already gated to full_access admins.
 */
export default function RevenuePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Revenue"
        description="Subscription revenue and analytics (full access only)."
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Coming soon
          </CardTitle>
          <CardDescription>
            Revenue dashboards (MRR, active subscriptions, churn, paid invoices) will live here. The
            data already exists in the registry (subscriptions + subscription_invoices).
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This view is restricted to full-access administrators.
        </CardContent>
      </Card>
    </div>
  );
}
