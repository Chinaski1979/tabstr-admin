import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/StateViews';
import { useOrganizationMembers } from '@/hooks/useOrgUsers';
import { formatDate } from '@/lib/utils';
import type { OrganizationMember, OrganizationRegistry } from '@/types';

import { CreateOrgUserDialog } from './CreateOrgUserDialog';
import { orgMembershipRoleLabel } from './orgUserForm';

export function OrganizationMembersCard({ organization }: { organization: OrganizationRegistry }) {
  const { members, isLoading, error, isSharedProject } = useOrganizationMembers(organization);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | undefined>();

  const openCreateDialog = () => {
    setSelectedMember(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = (member: OrganizationMember) => {
    setSelectedMember(member);
    setDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Members</CardTitle>
            <CardDescription>
              Users with access to this organization in its Supabase project.
            </CardDescription>
          </div>
          {isSharedProject && (
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Create user
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {!isSharedProject && (
            <div className="px-6 pb-6">
              <EmptyState
                title="Members unavailable"
                description="This organization is not on a configured shared Supabase project, so members cannot be listed or created from the admin panel."
              />
            </div>
          )}
          {isSharedProject && isLoading && <LoadingState />}
          {isSharedProject && !isLoading && error && <ErrorState error={error} />}
          {isSharedProject && !isLoading && !error && members.length === 0 && (
            <EmptyState
              title="No members yet"
              description="Create the first user for this organization."
              action={
                <Button size="sm" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4" />
                  Create user
                </Button>
              }
            />
          )}
          {isSharedProject && !isLoading && !error && members.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.email || '—'}</TableCell>
                    <TableCell>{member.fullName || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{orgMembershipRoleLabel(member.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.isActive ? 'success' : 'secondary'}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(member.joinedAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => openEditDialog(member)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit member</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isSharedProject && (
        <CreateOrgUserDialog
          key={selectedMember?.id ?? 'create'}
          organization={organization}
          member={selectedMember}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  );
}
