import { getRegistryClient } from "@/integrations/supabase/client";
import type {
  CreatePlatformMessageInput,
  PlatformMessage,
  UpdatePlatformMessageInput,
} from "@/types";

const SELECT =
  "id, organization_registry_id, message_text, expires_at, is_active, is_urgent, is_dismissible, created_by, created_at, updated_at";

function assertNonEmptyMessageText(messageText: string): string {
  const trimmed = messageText.trim();
  if (!trimmed) {
    throw new Error("Message text cannot be empty");
  }
  return trimmed;
}

function mapRow(row: Record<string, unknown>): PlatformMessage {
  return {
    id: row.id as string,
    organizationRegistryId: (row.organization_registry_id as string | null) ?? null,
    messageText: row.message_text as string,
    expiresAt: new Date(row.expires_at as string),
    isActive: row.is_active as boolean,
    isUrgent: row.is_urgent as boolean,
    isDismissible: row.is_dismissible as boolean,
    createdBy: (row.created_by as string | undefined) ?? undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export const platformMessagesService = {
  async getGlobal(): Promise<PlatformMessage[]> {
    const supabase = getRegistryClient();
    const { data, error } = await supabase
      .from("platform_messages")
      .select(SELECT)
      .is("organization_registry_id", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async getForOrganization(orgRegistryId: string): Promise<PlatformMessage[]> {
    const supabase = getRegistryClient();
    const { data, error } = await supabase
      .from("platform_messages")
      .select(SELECT)
      .eq("organization_registry_id", orgRegistryId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async create(
    input: CreatePlatformMessageInput,
    createdBy: string,
  ): Promise<PlatformMessage> {
    const supabase = getRegistryClient();
    const messageText = assertNonEmptyMessageText(input.messageText);
    const { data, error } = await supabase
      .from("platform_messages")
      .insert({
        organization_registry_id: input.organizationRegistryId ?? null,
        message_text: messageText,
        expires_at: input.expiresAt.toISOString(),
        is_active: input.isActive ?? true,
        is_urgent: input.isUrgent ?? false,
        is_dismissible: input.isDismissible ?? true,
        created_by: createdBy,
      })
      .select(SELECT)
      .single();

    if (error) throw error;
    return mapRow(data);
  },

  async update(messageId: string, input: UpdatePlatformMessageInput): Promise<PlatformMessage> {
    const supabase = getRegistryClient();
    const messageText = assertNonEmptyMessageText(input.messageText);
    const { data, error } = await supabase
      .from("platform_messages")
      .update({
        message_text: messageText,
        expires_at: input.expiresAt.toISOString(),
        is_active: input.isActive,
        is_urgent: input.isUrgent,
        is_dismissible: input.isDismissible,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .select(SELECT)
      .single();

    if (error) throw error;
    return mapRow(data);
  },

  async delete(messageId: string): Promise<void> {
    const supabase = getRegistryClient();
    const { error } = await supabase.from("platform_messages").delete().eq("id", messageId);
    if (error) throw error;
  },

  async toggleStatus(messageId: string, isActive: boolean): Promise<PlatformMessage> {
    const supabase = getRegistryClient();
    const { data, error } = await supabase
      .from("platform_messages")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .select(SELECT)
      .single();

    if (error) throw error;
    return mapRow(data);
  },
};
