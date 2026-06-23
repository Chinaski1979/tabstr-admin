import { getRegistryClient } from "@/integrations/supabase/client";

export const authService = {
  async signInWithPassword(email: string, password: string) {
    const supabase = getRegistryClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const supabase = getRegistryClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const supabase = getRegistryClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },
};
