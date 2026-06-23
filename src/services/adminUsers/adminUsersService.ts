import { getRegistryClient } from "@/integrations/supabase/client";
import type { AdminUser, AdminRole } from "@/types";

function mapRow(row: any): AdminUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role as AdminRole,
    isActive: row.is_active ?? true,
    createdAt: new Date(row.created_at),
  };
}

export const adminUsersService = {
  /** Loads the admin_users row for the current auth user (null if not an admin). */
  async getByUserId(userId: string): Promise<AdminUser | null> {
    const supabase = getRegistryClient();
    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email, role, is_active, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapRow(data);
  },

  /** Lists all admin users — full-access admins only (enforced by RLS). */
  async getAll(): Promise<AdminUser[]> {
    const supabase = getRegistryClient();
    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email, role, is_active, created_at")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []).map(mapRow);
  },
};
