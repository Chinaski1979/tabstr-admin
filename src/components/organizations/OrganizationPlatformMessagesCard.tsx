import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateViews";
import {
  PlatformMessageDialog,
  PlatformMessagesTable,
} from "@/components/platformMessages/PlatformMessagesManager";
import { useOrganizationPlatformMessages } from "@/hooks/usePlatformMessages";

export function OrganizationPlatformMessagesCard({ orgRegistryId }: { orgRegistryId: string }) {
  const { messages, isLoading, error } = useOrganizationPlatformMessages(orgRegistryId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Platform messages</CardTitle>
          <CardDescription>
            Messages shown only in this organization&apos;s POS header (e.g. pending payment).
          </CardDescription>
        </div>
        <PlatformMessageDialog
          orgRegistryId={orgRegistryId}
          scopeLabel="This message will appear only for this organization."
        />
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState />}
        {!isLoading && error && <ErrorState error={error} />}
        {!isLoading && !error && messages.length === 0 && (
          <EmptyState title="No organization messages" />
        )}
        {!isLoading && !error && messages.length > 0 && (
          <PlatformMessagesTable messages={messages} orgRegistryId={orgRegistryId} />
        )}
      </CardContent>
    </Card>
  );
}
