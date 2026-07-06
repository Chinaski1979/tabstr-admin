/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REGISTRY_SUPABASE_URL: string;
  readonly VITE_REGISTRY_SUPABASE_ANON_KEY: string;
  readonly VITE_SHARED_PROJECT_1_SERVICE_KEY?: string;
  readonly VITE_SHARED_PROJECT_2_SERVICE_KEY?: string;
  readonly VITE_SHARED_PROJECT_3_SERVICE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
