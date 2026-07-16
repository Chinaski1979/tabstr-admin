import { getRegistryClient } from "@/integrations/supabase/client";
import type { OrganizationRegistry } from "@/types";

function mapRow(row: any): OrganizationRegistry {
  return {
    id: row.id,
    organizationSlug: row.organization_slug,
    supabaseUrl: row.supabase_url,
    supabaseAnonKey: row.supabase_anon_key,
    isActive: row.is_active ?? false,
    isSuspended: row.is_suspended ?? false,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at ?? row.created_at),
  };
}

const SELECT =
  "id, organization_slug, supabase_url, supabase_anon_key, is_active, is_suspended, created_at, updated_at";

export const organizationsService = {
  async getAll(): Promise<OrganizationRegistry[]> {
    const supabase = getRegistryClient();
    const { data, error } = await supabase
      .from("organization_registry")
      .select(SELECT)
      .order("organization_slug");

    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<OrganizationRegistry | null> {
    const supabase = getRegistryClient();
    const { data, error } = await supabase
      .from("organization_registry")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapRow(data) : null;
  },

  async setActive(id: string, isActive: boolean): Promise<OrganizationRegistry> {
    const supabase = getRegistryClient();
    const { data, error } = await supabase
      .from("organization_registry")
      .update({ is_active: isActive })
      .eq("id", id)
      .select(SELECT)
      .single();

    if (error) throw error;
    return mapRow(data);
  },

  async setSuspended(id: string, isSuspended: boolean): Promise<OrganizationRegistry> {
    const supabase = getRegistryClient();
    const { data, error } = await supabase
      .from("organization_registry")
      .update({ is_suspended: isSuspended })
      .eq("id", id)
      .select(SELECT)
      .single();

    if (error) throw error;
    return mapRow(data);
  },
};
