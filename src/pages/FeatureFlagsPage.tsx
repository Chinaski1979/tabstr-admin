import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateViews";
import { CreateFeatureFlagDialog } from "@/components/featureFlags/CreateFeatureFlagDialog";
import { useFeatureFlags, useSetGlobalFeatureFlag } from "@/hooks/useFeatureFlags";

export default function FeatureFlagsPage() {
  const { flags, isLoading, error } = useFeatureFlags();
  const { setGlobalEnabled, isUpdating } = useSetGlobalFeatureFlag();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Global feature flags"
        description="Master switches that apply across all organizations. A feature also has to be enabled per-organization to go live."
        actions={<CreateFeatureFlagDialog />}
      />
      <Card>
        <CardContent className="p-0">
          {isLoading && <LoadingState />}
          {!isLoading && error && <ErrorState error={error} />}
          {!isLoading && !error && flags.length === 0 && (
            <EmptyState
              title="No feature flags"
              description="Create a feature flag to get started."
              action={<CreateFeatureFlagDialog />}
            />
          )}
          {!isLoading && !error && flags.length > 0 && (
            <ul className="divide-y">
              {flags.map((flag) => (
                <li key={flag.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{flag.featureName}</span>
                      {flag.isPaid && <Badge variant="outline">Paid</Badge>}
                      {flag.planName && <Badge variant="secondary">{flag.planName}</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {flag.isEnabled ? "Enabled globally" : "Disabled globally"}
                    </span>
                  </div>
                  <Switch
                    checked={flag.isEnabled}
                    disabled={isUpdating}
                    onCheckedChange={(checked) =>
                      setGlobalEnabled({ flagId: flag.id, isEnabled: checked })
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
