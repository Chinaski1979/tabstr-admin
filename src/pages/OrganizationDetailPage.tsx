import { useParams, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullPageLoader, ErrorState, EmptyState } from "@/components/common/StateViews";
import { OrganizationStatusToggle } from "@/components/organizations/OrganizationStatusToggle";
import { OrganizationFeaturesCard } from "@/components/organizations/OrganizationFeaturesCard";
import { OrganizationSpecialPlanCard } from "@/components/organizations/specialPlan/OrganizationSpecialPlanCard";
import { OrganizationSubscriptionCard } from "@/components/organizations/OrganizationSubscriptionCard";
import { useOrganization } from "@/hooks/useOrganizations";
import { formatDate } from "@/lib/utils";

export default function OrganizationDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { organization, isLoading, error } = useOrganization(id);

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
            <Badge variant={organization.isActive ? "success" : "secondary"}>
              {organization.isActive ? "Active" : "Inactive"}
            </Badge>
          </Detail>
          <Detail label="Registered">{formatDate(organization.createdAt)}</Detail>
          <Detail label="Supabase URL">
            <span className="font-mono text-xs">{organization.supabaseUrl}</span>
          </Detail>
          <Detail label="Anon key">
            <span className="font-mono text-xs text-muted-foreground">
              {organization.supabaseAnonKey.slice(0, 12)}…{organization.supabaseAnonKey.slice(-6)}
            </span>
          </Detail>
        </CardContent>
      </Card>
      <Tabs defaultValue="features">
        <TabsList>
          <TabsTrigger value="features">Feature flags</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>
        <TabsContent value="features">
          <OrganizationFeaturesCard orgRegistryId={organization.id} />
        </TabsContent>
        <TabsContent value="subscription">
          <OrganizationSubscriptionCard orgRegistryId={organization.id} />
        </TabsContent>
      </Tabs>
      <OrganizationSpecialPlanCard orgRegistryId={organization.id} />
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
