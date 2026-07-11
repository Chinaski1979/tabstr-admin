/**
 * Shared Supabase projects used when provisioning orgs into an existing DB.
 * Fill in supabaseUrl and supabaseAnonKey per project; service role keys live in .env.
 */
export interface SharedSupabaseProject {
  id: string;
  label: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  serviceKeyEnvVar: string;
}

export const SHARED_SUPABASE_PROJECTS: readonly SharedSupabaseProject[] = [
  {
    id: 'project-1',
    label: 'Alfa project',
    supabaseUrl: 'https://jriafwvfwwlduldgdqjf.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyaWFmd3Zmd3dsZHVsZGdkcWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MTM1MjQsImV4cCI6MjA2NDk4OTUyNH0.LD991MO8ieMToDmwYAxcB621WzPM-GXHekK-T8cYyII',
    serviceKeyEnvVar: 'VITE_SHARED_PROJECT_1_SERVICE_KEY',
  },
  {
    id: 'project-2',
    label: 'Ballena vibes project',
    supabaseUrl: 'https://ltnivqbihulzbbxmvefz.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0bml2cWJpaHVsemJieG12ZWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDc3MDUsImV4cCI6MjA3OTY4MzcwNX0.nYOYn_Sh7V1xfEg--Rxq3ktX2U9_8GlR7s3_OWXo-Qc',
    serviceKeyEnvVar: 'VITE_SHARED_PROJECT_2_SERVICE_KEY',
  },
  {
    id: 'project-3',
    label: 'Aura project',
    supabaseUrl: 'https://ssyueapoolgtwkpsoqwm.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzeXVlYXBvb2xndHdrcHNvcXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDE3NDAsImV4cCI6MjA3ODE3Nzc0MH0.iexjr001Wlo3pGQF3Ejs0vc5eTFZBpQUD4txFE9eNBs',
    serviceKeyEnvVar: 'VITE_SHARED_PROJECT_3_SERVICE_KEY',
  },
];

export function getSharedProject(id: string): SharedSupabaseProject | undefined {
  return SHARED_SUPABASE_PROJECTS.find((p) => p.id === id);
}

export function resolveSharedProjectCredentials(projectId: string): {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
} {
  const project = getSharedProject(projectId);
  if (!project) {
    throw new Error('Selected Supabase project not found');
  }

  const serviceKey = import.meta.env[project.serviceKeyEnvVar as keyof ImportMetaEnv];
  if (!serviceKey || typeof serviceKey !== 'string') {
    throw new Error(
      `Missing ${project.serviceKeyEnvVar} in .env — required for ${project.label}`,
    );
  }

  return {
    supabaseUrl: project.supabaseUrl,
    supabaseAnonKey: project.supabaseAnonKey,
    supabaseServiceKey: serviceKey,
  };
}
