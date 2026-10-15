import { useState } from "react";
import { useNavigate } from "react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/StateViews";
import { RevenueCollectedByMonth } from "@/components/revenue/RevenueCollectedByMonth";
import { RevenueInvoicesTable } from "@/components/revenue/RevenueInvoicesTable";
import { RevenueKpis } from "@/components/revenue/RevenueKpis";
import { RevenueSpecialPlansTable } from "@/components/revenue/RevenueSpecialPlansTable";
import { RevenueUnbilledNotice } from "@/components/revenue/RevenueUnbilledNotice";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRevenue } from "@/hooks/useRevenue";
import { isRevenueEmpty } from "@/lib/revenue";
import type { RevenuePeriod } from "@/types";

export default function RevenuePage() {
  const navigate = useNavigate();
  const { overview, isLoading, error } = useRevenue();
  const [period, setPeriod] = useState<RevenuePeriod>("monthly");

  const handleSelectOrganization = (orgRegistryId: string) => {
    navigate(`/organizations/${orgRegistryId}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Revenue"
        description="Contracted net from special plans (ex-IVA). Collected history is card payments and includes IVA."
        actions={
          <Tabs value={period} onValueChange={(value) => setPeriod(value as RevenuePeriod)}>
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} />
      ) : !overview || isRevenueEmpty(overview) ? (
        <EmptyState
          title="No revenue yet"
          description="Create special plans and paid invoices will show contracted and collected totals here."
        />
      ) : (
        <>
          <RevenueKpis overview={overview} period={period} />
          <RevenueUnbilledNotice plans={overview.plans} />
          <RevenueCollectedByMonth months={overview.byMonth} />
          <RevenueSpecialPlansTable
            plans={overview.plans}
            onSelectOrganization={handleSelectOrganization}
          />
          <RevenueInvoicesTable
            invoices={overview.invoices}
            onSelectOrganization={handleSelectOrganization}
          />
        </>
      )}
    </div>
  );
}
