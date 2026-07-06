import { resolveSharedProjectCredentials } from '@/config/sharedSupabaseProjects';

export interface ProvisioningCredentials {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
}

export interface ProvisioningCredentialsInput {
  runMigrations: boolean;
  sharedProjectId?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceKey?: string;
}

/** Resolves credentials or throws (for submit). */
export function resolveProvisioningCredentials(
  input: ProvisioningCredentialsInput,
): ProvisioningCredentials {
  if (input.runMigrations) {
    const supabaseUrl = input.supabaseUrl?.trim();
    const supabaseAnonKey = input.supabaseAnonKey?.trim();
    const supabaseServiceKey = input.supabaseServiceKey?.trim();
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Supabase URL, anon key, and service role key are required');
    }
    return { supabaseUrl, supabaseAnonKey, supabaseServiceKey };
  }

  if (!input.sharedProjectId) {
    throw new Error('Select a Supabase project');
  }

  return resolveSharedProjectCredentials(input.sharedProjectId);
}

/** Returns null when credentials are not yet complete (e.g. email check while typing). */
export function tryResolveProvisioningCredentials(
  input: ProvisioningCredentialsInput,
): ProvisioningCredentials | null {
  try {
    if (input.runMigrations) {
      const supabaseUrl = input.supabaseUrl?.trim();
      const supabaseAnonKey = input.supabaseAnonKey?.trim();
      const supabaseServiceKey = input.supabaseServiceKey?.trim();
      if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) return null;
      return { supabaseUrl, supabaseAnonKey, supabaseServiceKey };
    }

    if (!input.sharedProjectId) return null;
    return resolveSharedProjectCredentials(input.sharedProjectId);
  } catch {
    return null;
  }
}
