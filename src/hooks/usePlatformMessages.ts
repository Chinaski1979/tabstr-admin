import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { platformMessagesService } from "@/services/platformMessages/platformMessagesService";
import { queryKeys } from "@/lib/queryKeys";
import { STALE_TIME } from "@/lib/queryCacheConfig";
import { useAuth } from "@/hooks/useAuth";
import type {
  CreatePlatformMessageInput,
  PlatformMessage,
  UpdatePlatformMessageInput,
} from "@/types";

export function useGlobalPlatformMessages() {
  const {
    data: messages = [],
    isPending: isLoading,
    error,
  } = useQuery<PlatformMessage[]>({
    queryKey: queryKeys.globalPlatformMessages(),
    queryFn: () => platformMessagesService.getGlobal(),
    staleTime: STALE_TIME.platformMessages,
  });

  return { messages, isLoading, error };
}

export function useOrganizationPlatformMessages(orgRegistryId: string) {
  const {
    data: messages = [],
    isPending: isLoading,
    error,
  } = useQuery<PlatformMessage[]>({
    queryKey: queryKeys.organizationPlatformMessages(orgRegistryId),
    queryFn: () => platformMessagesService.getForOrganization(orgRegistryId),
    enabled: !!orgRegistryId,
    staleTime: STALE_TIME.platformMessages,
  });

  return { messages, isLoading, error };
}

function invalidatePlatformMessageQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  orgRegistryId?: string | null,
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.globalPlatformMessages() });
  if (orgRegistryId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.organizationPlatformMessages(orgRegistryId),
    });
  }
}

export function useCreatePlatformMessage(orgRegistryId?: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const mutation = useMutation({
    mutationFn: (input: CreatePlatformMessageInput) => {
      if (!user?.id) throw new Error("Not authenticated");
      return platformMessagesService.create(input, user.id);
    },
    onSuccess: (message) => {
      toast.success("Message created");
      invalidatePlatformMessageQueries(
        queryClient,
        message.organizationRegistryId ?? orgRegistryId,
      );
    },
    onError: (error: Error) => {
      toast.error("Could not create message", { description: error.message });
    },
  });

  return { createMessage: mutation.mutateAsync, isCreating: mutation.isPending };
}

export function useUpdatePlatformMessage(orgRegistryId?: string | null) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      messageId,
      input,
    }: {
      messageId: string;
      input: UpdatePlatformMessageInput;
    }) => platformMessagesService.update(messageId, input),
    onSuccess: (message) => {
      toast.success("Message updated");
      invalidatePlatformMessageQueries(
        queryClient,
        message.organizationRegistryId ?? orgRegistryId,
      );
    },
    onError: (error: Error) => {
      toast.error("Could not update message", { description: error.message });
    },
  });

  return { updateMessage: mutation.mutateAsync, isUpdating: mutation.isPending };
}

export function useDeletePlatformMessage(orgRegistryId?: string | null) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (messageId: string) => platformMessagesService.delete(messageId),
    onSuccess: () => {
      toast.success("Message deleted");
      invalidatePlatformMessageQueries(queryClient, orgRegistryId);
    },
    onError: (error: Error) => {
      toast.error("Could not delete message", { description: error.message });
    },
  });

  return { deleteMessage: mutation.mutateAsync, isDeleting: mutation.isPending };
}

export function useTogglePlatformMessageStatus(orgRegistryId?: string | null) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ messageId, isActive }: { messageId: string; isActive: boolean }) =>
      platformMessagesService.toggleStatus(messageId, isActive),
    onSuccess: (message) => {
      toast.success(message.isActive ? "Message activated" : "Message deactivated");
      invalidatePlatformMessageQueries(
        queryClient,
        message.organizationRegistryId ?? orgRegistryId,
      );
    },
    onError: (error: Error) => {
      toast.error("Could not update message status", { description: error.message });
    },
  });

  return { toggleStatus: mutation.mutate, isToggling: mutation.isPending };
}
