import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateViews";
import {
  PlatformMessageDialog,
  PlatformMessagesTable,
} from "@/components/platformMessages/PlatformMessagesManager";
import { useGlobalPlatformMessages } from "@/hooks/usePlatformMessages";

export default function PlatformMessagesPage() {
  const { messages, isLoading, error } = useGlobalPlatformMessages();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Platform messages"
        description="Broadcast messages shown in the POS app header for all organizations."
        actions={
          <PlatformMessageDialog
            orgRegistryId={null}
            scopeLabel="This message will appear for all organizations."
          />
        }
      />
      <Card>
        <CardContent className="p-0">
          {isLoading && <LoadingState />}
          {!isLoading && error && <ErrorState error={error} />}
          {!isLoading && !error && messages.length === 0 && (
            <EmptyState
              title="No global messages"
              description="Create a message to announce features or maintenance to every organization."
              action={
                <PlatformMessageDialog
                  orgRegistryId={null}
                  scopeLabel="This message will appear for all organizations."
                />
              }
            />
          )}
          {!isLoading && !error && messages.length > 0 && (
            <PlatformMessagesTable messages={messages} orgRegistryId={null} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
