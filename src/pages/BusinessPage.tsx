import { useState } from "react";
import { useNavigate } from "react-router";

import { BusinessAtRiskList } from "@/components/business/BusinessAtRiskList";
import { BusinessKpis } from "@/components/business/BusinessKpis";
import { BusinessMonthClose } from "@/components/business/BusinessMonthClose";
import { BusinessRetention } from "@/components/business/BusinessRetention";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState, LoadingState } from "@/components/common/StateViews";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBusiness, useCloseBusinessMonth } from "@/hooks/useBusiness";
import {
  buildCustomerValue,
  buildRetention,
  collectedInMonth,
  monthWasClosed,
  previousMonthKey,
  snapshotsForMonth,
} from "@/lib/business";
import { currenciesInUse, filterRevenueByCurrency, formatMonthLabel } from "@/lib/revenue";
import type { SubscriptionCurrency } from "@/types";

export default function BusinessPage() {
  const navigate = useNavigate();
  const { scorecard, isLoading, error } = useBusiness();
  const { closeMonth, isClosing } = useCloseBusinessMonth();
  const [monthOverride, setMonthOverride] = useState<string | null>(null);
  const [selectedCurrency, setCurrency] = useState<SubscriptionCurrency>("USD");

  const month = monthOverride ?? scorecard?.asOfMonth ?? "";
  const currencies = scorecard ? currenciesInUse(scorecard.plans, scorecard.invoices) : [];
  const currency: SubscriptionCurrency =
    currencies.length === 0 || currencies.includes(selectedCurrency) ? selectedCurrency : currencies[0];
  const health = scorecard?.healthByCurrency[currency] ?? null;
  // USD and CRC are never summed: every money figure below is scoped to one currency.
  const scoped = scorecard
    ? {
        ...filterRevenueByCurrency(scorecard.plans, scorecard.invoices, currency),
        snapshots: scorecard.snapshots.filter((row) => row.currency === currency),
      }
    : null;
  // Monthly close (burn) compares USD expenses, so it always uses USD collections.
  const usdScoped = scorecard ? filterRevenueByCurrency([], scorecard.invoices, "USD") : null;
  const crcCollected = scorecard
    ? collectedInMonth(filterRevenueByCurrency([], scorecard.invoices, "CRC").invoices, month)
    : 0;
  const previousMonth = month ? previousMonthKey(month) : "";
  const selectedClosed = scorecard ? monthWasClosed(scorecard.closes, month) : false;
  const previousClosed = scorecard ? monthWasClosed(scorecard.closes, previousMonth) : false;
  const movement =
    scoped && selectedClosed && previousClosed
      ? buildRetention(
          snapshotsForMonth(scoped.snapshots, previousMonth),
          snapshotsForMonth(scoped.snapshots, month),
        )
      : null;
  const baseCustomerValue =
    scorecard && scoped && health && month
      ? buildCustomerValue({
          endMonth: month,
          snapshots: scoped.snapshots,
          closes: scorecard.closes,
          // Plans only feed new-logo counts for CAC; sales spend covers every customer.
          plans: scorecard.plans,
          arpu: health.arpu,
        })
      : null;
  // CAC comes from USD sales spend, so LTV:CAC is only meaningful in USD.
  const customerValue =
    baseCustomerValue && currency !== "USD"
      ? { ...baseCustomerValue, ltvCac: null }
      : baseCustomerValue;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Business"
        description={
          scorecard
            ? `Live health for ${formatMonthLabel(scorecard.asOfMonth)}. Burn and retention use the month you close.`
            : "Contracted revenue, collection, burn, and retention."
        }
        actions={
          currencies.length > 1 ? (
            <Tabs value={currency} onValueChange={(value) => setCurrency(value as SubscriptionCurrency)}>
              <TabsList>
                {currencies.map((value) => (
                  <TabsTrigger key={value} value={value}>
                    {value}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : null
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} />
      ) : scorecard && health && usdScoped && customerValue ? (
        <>
          <BusinessKpis health={health} currency={currency} />
          <BusinessAtRiskList
            customers={health.atRisk}
            onSelectOrganization={(orgRegistryId) => navigate(`/organizations/${orgRegistryId}`)}
          />
          <BusinessMonthClose
            key={month}
            month={month}
            plans={scorecard.plans}
            invoices={usdScoped.invoices}
            closes={scorecard.closes}
            crcCollected={crcCollected}
            isClosing={isClosing}
            onMonthChange={setMonthOverride}
            onCloseMonth={closeMonth}
          />
          <BusinessRetention
            month={month}
            previousMonth={previousMonth}
            selectedClosed={selectedClosed}
            previousClosed={previousClosed}
            movement={movement}
            customerValue={customerValue}
            currency={currency}
          />
        </>
      ) : null}
    </div>
  );
}
