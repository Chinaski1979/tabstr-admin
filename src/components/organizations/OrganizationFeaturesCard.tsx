import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateViews";
import { useOrganizationFeatures, useSetOrganizationFeature } from "@/hooks/useFeatureFlags";

export function OrganizationFeaturesCard({ orgRegistryId }: { orgRegistryId: string }) {
  const { features, isLoading, error } = useOrganizationFeatures(orgRegistryId);
  const { setOrganizationFeature, isUpdating } = useSetOrganizationFeature(orgRegistryId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature flags</CardTitle>
        <CardDescription>
          Toggle features for this organization. A feature is only live when its global switch is on
          and it is enabled here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState />}
        {!isLoading && error && <ErrorState error={error} />}
        {!isLoading && !error && features.length === 0 && (
          <EmptyState title="No feature flags defined" />
        )}
        {!isLoading && !error && features.length > 0 && (
          <ul className="divide-y">
            {features.map((feature) => (
              <li key={feature.flag.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{feature.flag.featureName}</span>
                    {feature.flag.isPaid && <Badge variant="outline">Paid</Badge>}
                    {!feature.flag.isEnabled && (
                      <Badge variant="secondary">Off globally</Badge>
                    )}
                    {feature.effectivelyEnabled && <Badge variant="success">Live</Badge>}
                  </div>
                  {feature.flag.description && (
                    <span className="text-xs text-muted-foreground">
                      {feature.flag.description}
                    </span>
                  )}
                  {feature.flag.planName && (
                    <span className="text-xs text-muted-foreground">
                      Plan: {feature.flag.planName}
                    </span>
                  )}
                </div>
                <Switch
                  className="mt-0.5 shrink-0"
                  checked={feature.active}
                  disabled={isUpdating}
                  onCheckedChange={(checked) =>
                    setOrganizationFeature({ flagId: feature.flag.id, active: checked })
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
