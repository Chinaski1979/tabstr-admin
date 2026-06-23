import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateViews";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { formatDate } from "@/lib/utils";

export default function AdminsPage() {
  const { admins, isLoading, error } = useAdminUsers();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Administrators"
        description="Admin accounts. Create new admins from the registry Supabase Auth dashboard, then add a row in admin_users."
      />
      <Card>
        <CardContent className="p-0">
          {isLoading && <LoadingState />}
          {!isLoading && error && <ErrorState error={error} />}
          {!isLoading && !error && admins.length === 0 && <EmptyState title="No administrators" />}
          {!isLoading && !error && admins.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.email}</TableCell>
                    <TableCell>
                      <Badge variant={admin.role === "full_access" ? "default" : "secondary"}>
                        {admin.role === "full_access" ? "Full access" : "Standard"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={admin.isActive ? "success" : "secondary"}>
                        {admin.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(admin.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
