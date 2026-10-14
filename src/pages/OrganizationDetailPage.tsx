import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullPageLoader, ErrorState, EmptyState } from "@/components/common/StateViews";
import { OrganizationStatusToggle } from "@/components/organizations/OrganizationStatusToggle";
import { OrganizationFeaturesCard } from "@/components/organizations/OrganizationFeaturesCard";
import { OrganizationPlatformMessagesCard } from "@/components/organizations/OrganizationPlatformMessagesCard";
import { OrganizationSpecialPlanCard } from "@/components/organizations/specialPlan/OrganizationSpecialPlanCard";
import { OrganizationMembersCard } from "@/components/organizations/members/OrganizationMembersCard";
import { OrganizationSubscriptionCard } from "@/components/organizations/OrganizationSubscriptionCard";
import { DeleteOrganizationButton } from "@/components/organizations/delete/DeleteOrganizationButton";
import { AuditReportView } from "@/components/organizations/delete/AuditReportView";
import { useAuth } from "@/hooks/useAuth";
import { useOrgDeleteAuditReports } from "@/hooks/useOrgDelete";
import { useOrganization } from "@/hooks/useOrganizations";
import { formatDate } from "@/lib/utils";
import type { AuditReport } from "@/types";

function reportSummary(report: AuditReport): string {
  if (report.aborted) return "Aborted";
  if (report.phase2DeleteOk === false) return "Failed — not deleted";
  if (report.success) return "Completed";
  return "Completed with issues";
}

export default function OrganizationDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { organization, isLoading, error } = useOrganization(id);
  const { isFullAccess } = useAuth();
  const { reports } = useOrgDeleteAuditReports();
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  if (isLoading) return <FullPageLoader />;
  if (error) return <ErrorState error={error} />;
  if (!organization) return <EmptyState title="Organization not found" />;

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit -ml-2 text-muted-foreground"
        onClick={() => navigate("/organizations")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to organizations
      </Button>

      <PageHeader
        title={organization.organizationSlug}
        description="Registry details, features and subscription."
        actions={<OrganizationStatusToggle organization={organization} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Registry details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Detail label="Status">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={organization.isActive ? "success" : "secondary"}>
                {organization.isActive ? "Active" : "Inactive"}
              </Badge>
              {organization.isSuspended && (
                <Badge variant="secondary" className="text-amber-700 dark:text-amber-400">
                  Suspended
                </Badge>
              )}
            </div>
          </Detail>
          <Detail label="Registered">{formatDate(organization.createdAt)}</Detail>
          <Detail label="Supabase URL">
            <span className="break-all font-mono text-xs">{organization.supabaseUrl}</span>
          </Detail>
          <Detail label="Anon key">
            <span className="font-mono text-xs text-muted-foreground">
              {organization.supabaseAnonKey.slice(0, 12)}…{organization.supabaseAnonKey.slice(-6)}
            </span>
          </Detail>
        </CardContent>
      </Card>
      <Tabs defaultValue="features">
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="features">Feature flags</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>
        <TabsContent value="features">
          <OrganizationFeaturesCard orgRegistryId={organization.id} />
        </TabsContent>
        <TabsContent value="messages">
          <OrganizationPlatformMessagesCard orgRegistryId={organization.id} />
        </TabsContent>
        <TabsContent value="subscription">
          <OrganizationSubscriptionCard orgRegistryId={organization.id} />
        </TabsContent>
      </Tabs>
      <OrganizationSpecialPlanCard orgRegistryId={organization.id} />
      <OrganizationMembersCard organization={organization} />
      <Card className="border-destructive/40">
        <CardHeader className="gap-1.5">
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Permanently delete this organization: its project database rows, its registry entry and
            its admin users. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {isFullAccess
                ? "The flow shows a dry-run of everything that will be deleted, requires typing the exact slug and produces a downloadable audit report."
                : "Only full-access admins can delete organizations."}
            </p>
            <DeleteOrganizationButton organization={organization} />
          </div>
          {reports.length > 0 && (
            <div className="flex flex-col gap-2 border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground">Past deletion reports</p>
              <ul className="flex flex-col gap-1.5">
                {reports.map((report) => (
                  <li key={report.id} className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs hover:bg-muted/50"
                      aria-expanded={expandedReportId === report.id}
                      onClick={() =>
                        setExpandedReportId((current) =>
                          current === report.id ? null : report.id,
                        )
                      }
                    >
                      <span className="font-mono">{report.slug}</span>
                      <span className="text-muted-foreground">{formatDate(report.startedAt)}</span>
                      <Badge
                        variant={
                          report.aborted || report.phase2DeleteOk === false
                            ? "destructive"
                            : report.success
                              ? "success"
                              : "secondary"
                        }
                      >
                        {reportSummary(report)}
                      </Badge>
                    </button>
                    {expandedReportId === report.id && <AuditReportView report={report} />}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}
