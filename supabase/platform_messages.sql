-- ============================================================================
-- Platform messages — registry broadcast table
-- Run on the central REGISTRY Supabase project (same as admin_setup.sql).
-- Idempotent; safe to re-run.
-- ============================================================================

create table if not exists public.platform_messages (
  id uuid primary key default gen_random_uuid(),
  organization_registry_id uuid references public.organization_registry(id) on delete cascade,
  -- NULL = global (all organizations); set = org-specific only
  message_text text not null,
  expires_at timestamptz not null,
  is_active boolean not null default true,
  is_urgent boolean not null default false,
  is_dismissible boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_messages_org_registry_id_idx
  on public.platform_messages (organization_registry_id);

create index if not exists platform_messages_active_expires_idx
  on public.platform_messages (is_active, expires_at desc);

alter table public.platform_messages enable row level security;
