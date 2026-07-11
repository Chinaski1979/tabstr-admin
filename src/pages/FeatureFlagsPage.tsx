import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateViews";
import { FeatureFlagDialog } from "@/components/featureFlags/FeatureFlagDialog";
import { useFeatureFlags, useSetGlobalFeatureFlag } from "@/hooks/useFeatureFlags";
import type { FeatureFlag } from "@/types";

export default function FeatureFlagsPage() {
  const { flags, isLoading, error } = useFeatureFlags();
  const { setGlobalEnabled, isUpdating } = useSetGlobalFeatureFlag();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Global feature flags"
        description="Master switches that apply across all organizations. A feature also has to be enabled per-organization to go live."
        actions={<FeatureFlagDialog />}
      />
      <Card>
        <CardContent className="p-0">
          {isLoading && <LoadingState />}
          {!isLoading && error && <ErrorState error={error} />}
          {!isLoading && !error && flags.length === 0 && (
            <EmptyState
              title="No feature flags"
              description="Create a feature flag to get started."
              action={<FeatureFlagDialog />}
            />
          )}
          {!isLoading && !error && flags.length > 0 && (
            <>
              <ul className="divide-y md:hidden">
                {flags.map((flag) => (
                  <FeatureFlagMobileRow
                    key={flag.id}
                    flag={flag}
                    isUpdating={isUpdating}
                    onToggle={(checked) =>
                      setGlobalEnabled({ flagId: flag.id, isEnabled: checked })
                    }
                  />
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-6 py-3 font-medium">Feature</th>
                      <th className="px-6 py-3 font-medium">Description</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {flags.map((flag) => (
                      <tr key={flag.id}>
                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{flag.featureName}</span>
                            {flag.isPaid && <Badge variant="outline">Paid</Badge>}
                            {flag.planName && (
                              <Badge variant="secondary">{flag.planName}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="max-w-md px-6 py-4 align-top text-muted-foreground">
                          {flag.description || "—"}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={flag.isEnabled}
                              disabled={isUpdating}
                              onCheckedChange={(checked) =>
                                setGlobalEnabled({ flagId: flag.id, isEnabled: checked })
                              }
                            />
                            <span className="text-xs text-muted-foreground">
                              {flag.isEnabled ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top text-right">
                          <FeatureFlagDialog flag={flag} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface FeatureFlagMobileRowProps {
  flag: FeatureFlag;
  isUpdating: boolean;
  onToggle: (checked: boolean) => void;
}

function FeatureFlagMobileRow({ flag, isUpdating, onToggle }: FeatureFlagMobileRowProps) {
  return (
    <li className="flex flex-col gap-3 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{flag.featureName}</span>
            {flag.isPaid && <Badge variant="outline">Paid</Badge>}
            {flag.planName && <Badge variant="secondary">{flag.planName}</Badge>}
          </div>
          {flag.description && (
            <p className="text-xs text-muted-foreground">{flag.description}</p>
          )}
        </div>
        <FeatureFlagDialog flag={flag} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {flag.isEnabled ? "Enabled globally" : "Disabled globally"}
        </span>
        <Switch checked={flag.isEnabled} disabled={isUpdating} onCheckedChange={onToggle} />
      </div>
    </li>
  );
}
