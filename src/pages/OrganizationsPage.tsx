import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateViews";
import { CreateOrganizationDialog } from "@/components/organizations/CreateOrganizationDialog";
import { OrganizationStatusToggle } from "@/components/organizations/OrganizationStatusToggle";
import { useOrganizations } from "@/hooks/useOrganizations";
import { formatDate } from "@/lib/utils";

type OrgListTab = "real" | "test";

export default function OrganizationsPage() {
  const navigate = useNavigate();
  const { organizations, isLoading, error } = useOrganizations();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<OrgListTab>("real");

  const realCount = useMemo(
    () => organizations.filter((o) => !o.isTest).length,
    [organizations],
  );
  const testCount = organizations.length - realCount;

  const filtered = useMemo(() => {
    const inTab = organizations.filter((o) => (tab === "test" ? o.isTest : !o.isTest));
    const q = query.trim().toLowerCase();
    if (!q) return inTab;
    return inTab.filter(
      (o) => o.organizationSlug.toLowerCase().includes(q) || o.supabaseUrl.toLowerCase().includes(q),
    );
  }, [organizations, query, tab]);

  const tabEmptyTitle = tab === "test" ? "No test organizations" : "No organizations";
  const tabEmptyDescription =
    tab === "test"
      ? "Mark an organization as test to list it here."
      : "Create your first organization to get started.";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Organizations"
        description="Every organization registered to Tabstr."
        actions={<CreateOrganizationDialog />}
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by slug or URL…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div>
        <Tabs value={tab} onValueChange={(value) => setTab(value as OrgListTab)}>
          <TabsList>
            <TabsTrigger value="real">Organizations ({realCount})</TabsTrigger>
            <TabsTrigger value="test">Test ({testCount})</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardContent className="p-0">
            {isLoading && <LoadingState />}
            {!isLoading && error && <ErrorState error={error} />}
            {!isLoading && !error && filtered.length === 0 && (
              <EmptyState
                title={query ? "No matches" : tabEmptyTitle}
                description={query ? "No organizations match your search." : tabEmptyDescription}
              />
            )}
            {!isLoading && !error && filtered.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Slug</TableHead>
                    <TableHead>Supabase URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((org) => (
                    <TableRow
                      key={org.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/organizations/${org.id}`)}
                    >
                      <TableCell className="font-medium">{org.organizationSlug}</TableCell>
                      <TableCell className="max-w-xs truncate font-mono text-xs text-muted-foreground">
                        {org.supabaseUrl}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={org.isActive ? "success" : "secondary"}>
                            {org.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {org.isSuspended && (
                            <Badge variant="secondary" className="text-amber-700 dark:text-amber-400">
                              Suspended
                            </Badge>
                          )}
                          {org.isTest && (
                            <Badge variant="secondary" className="text-violet-700 dark:text-violet-400">
                              Test
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(org.createdAt)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <OrganizationStatusToggle organization={org} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
