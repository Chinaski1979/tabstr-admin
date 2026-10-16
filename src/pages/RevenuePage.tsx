import { useState } from "react";
import { useNavigate } from "react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/StateViews";
import { RegisterPaymentDialog } from "@/components/revenue/RegisterPaymentDialog";
import { RevenueCollectedByMonth } from "@/components/revenue/RevenueCollectedByMonth";
import { RevenueInvoicesTable } from "@/components/revenue/RevenueInvoicesTable";
import { RevenueKpis } from "@/components/revenue/RevenueKpis";
import { RevenueSpecialPlansTable } from "@/components/revenue/RevenueSpecialPlansTable";
import { RevenueUnbilledNotice } from "@/components/revenue/RevenueUnbilledNotice";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useRevenue, useRevenueInvoices } from "@/hooks/useRevenue";
import { invoiceMonthOptions, isRevenueEmpty, monthKey } from "@/lib/revenue";
import type { RevenuePeriod } from "@/types";

export default function RevenuePage() {
  const navigate = useNavigate();
  const { isFullAccess } = useAuth();
  const { overview, isLoading, error } = useRevenue();
  const [period, setPeriod] = useState<RevenuePeriod>("monthly");
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const {
    invoices,
    isLoading: invoicesLoading,
    error: invoicesError,
  } = useRevenueInvoices(month);

  const handleSelectOrganization = (orgRegistryId: string) => {
    navigate(`/organizations/${orgRegistryId}`);
  };

  const plans = overview?.plans ?? [];
  const monthOptions = invoiceMonthOptions(overview?.byMonth ?? []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Revenue"
        description="Contracted net from special plans (ex-IVA). Collected history is paid invoices (card and transfer)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <RegisterPaymentDialog plans={plans} invoices={overview?.invoices ?? []} />
            {isFullAccess ? (
              <Tabs value={period} onValueChange={(value) => setPeriod(value as RevenuePeriod)}>
                <TabsList>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="yearly">Yearly</TabsTrigger>
                </TabsList>
              </Tabs>
            ) : null}
          </div>
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
          <RevenueKpis
            overview={overview}
            period={period}
            showFinancialTotals={isFullAccess}
          />
          <RevenueUnbilledNotice plans={overview.plans} />
          <RevenueCollectedByMonth months={overview.byMonth} />
          <RevenueSpecialPlansTable
            plans={overview.plans}
            onSelectOrganization={handleSelectOrganization}
          />
          <RevenueInvoicesTable
            invoices={invoices}
            month={month}
            monthOptions={monthOptions}
            isLoading={invoicesLoading}
            error={invoicesError}
            onMonthChange={setMonth}
            onSelectOrganization={handleSelectOrganization}
          />
        </>
      )}
    </div>
  );
}
