import { useState } from "react";
import { useNavigate } from "react-router";

import { BusinessAtRiskList } from "@/components/business/BusinessAtRiskList";
import { BusinessKpis } from "@/components/business/BusinessKpis";
import { BusinessMonthClose } from "@/components/business/BusinessMonthClose";
import { BusinessRetention } from "@/components/business/BusinessRetention";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState, LoadingState } from "@/components/common/StateViews";
import { useBusiness, useCloseBusinessMonth } from "@/hooks/useBusiness";
import {
  buildCustomerValue,
  buildRetention,
  monthWasClosed,
  previousMonthKey,
  snapshotsForMonth,
} from "@/lib/business";
import { formatMonthLabel } from "@/lib/revenue";

export default function BusinessPage() {
  const navigate = useNavigate();
  const { scorecard, isLoading, error } = useBusiness();
  const { closeMonth, isClosing } = useCloseBusinessMonth();
  const [monthOverride, setMonthOverride] = useState<string | null>(null);

  const month = monthOverride ?? scorecard?.asOfMonth ?? "";
  const previousMonth = month ? previousMonthKey(month) : "";
  const selectedClosed = scorecard ? monthWasClosed(scorecard.closes, month) : false;
  const previousClosed = scorecard ? monthWasClosed(scorecard.closes, previousMonth) : false;
  const movement =
    scorecard && selectedClosed && previousClosed
      ? buildRetention(
          snapshotsForMonth(scorecard.snapshots, previousMonth),
          snapshotsForMonth(scorecard.snapshots, month),
        )
      : null;
  const customerValue =
    scorecard && month
      ? buildCustomerValue({
          endMonth: month,
          snapshots: scorecard.snapshots,
          closes: scorecard.closes,
          plans: scorecard.plans,
          arpu: scorecard.health.arpu,
        })
      : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Business"
        description={
          scorecard
            ? `Live health for ${formatMonthLabel(scorecard.asOfMonth)}. Burn and retention use the month you close.`
            : "Contracted revenue, collection, burn, and retention."
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} />
      ) : scorecard && customerValue ? (
        <>
          <BusinessKpis health={scorecard.health} />
          <BusinessAtRiskList
            customers={scorecard.health.atRisk}
            onSelectOrganization={(orgRegistryId) => navigate(`/organizations/${orgRegistryId}`)}
          />
          <BusinessMonthClose
            key={month}
            month={month}
            plans={scorecard.plans}
            invoices={scorecard.invoices}
            closes={scorecard.closes}
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
          />
        </>
      ) : null}
    </div>
  );
}
