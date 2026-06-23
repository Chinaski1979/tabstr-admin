import { Building2, CheckCircle2, ToggleLeft, XCircle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/StateViews";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { profile } = useAuth();
  const { organizations, isLoading: orgsLoading, error } = useOrganizations();
  const { flags, isLoading: flagsLoading } = useFeatureFlags();

  const activeCount = organizations.filter((o) => o.isActive).length;
  const inactiveCount = organizations.length - activeCount;
  const enabledFlags = flags.filter((f) => f.isEnabled).length;

  const stats = [
    { label: "Organizations", value: organizations.length, icon: Building2 },
    { label: "Active", value: activeCount, icon: CheckCircle2 },
    { label: "Inactive", value: inactiveCount, icon: XCircle },
    { label: "Global flags on", value: `${enabledFlags}/${flags.length}`, icon: ToggleLeft },
  ];

  const loading = orgsLoading || flagsLoading;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welcome${profile?.email ? `, ${profile.email}` : ""}`}
        description="Overview of the Tabstr registry."
      />
      {error ? (
        <ErrorState error={error} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
