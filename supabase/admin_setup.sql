-- ============================================================================
-- Tabstr Admin — registry setup
-- ----------------------------------------------------------------------------
-- Run this ONCE on the central REGISTRY Supabase project (the same project the
-- POS uses as VITE_REGISTRY_SUPABASE_URL). It is idempotent and safe to re-run.
--
-- What it does:
--   1. Creates the admin_users table (the source of truth for who is an admin
--      and their tier: 'standard' or 'full_access').
--   2. Adds SECURITY DEFINER helper functions so RLS policies can check the
--      caller's admin tier WITHOUT recursive policy evaluation.
--   3. Adds RLS policies that let admins read/write the registry tables from the
--      admin console using only the anon key + an authenticated session.
--
-- After running: create admin users in Supabase Auth (Authentication > Users),
-- then insert a matching row in admin_users (see bottom of this file).
-- ============================================================================

-- 1) admin_users ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'admin_role') then
    create type public.admin_role as enum ('standard', 'full_access');
  end if;
end $$;

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.admin_role not null default 'standard',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- 2) Helper functions (SECURITY DEFINER bypasses RLS to avoid recursion) -----
create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a
    where a.id = auth.uid() and a.is_active
  );
$$;

create or replace function public.is_full_access_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a
    where a.id = auth.uid() and a.is_active and a.role = 'full_access'
  );
$$;

-- 3) admin_users policies ----------------------------------------------------
-- Every admin can read their own row (needed for the app to learn its own role).
drop policy if exists "admin_users_select_self" on public.admin_users;
create policy "admin_users_select_self"
  on public.admin_users for select
  to authenticated
  using (id = auth.uid());

-- Full-access admins can read all admin rows (Administrators page).
drop policy if exists "admin_users_select_full_access" on public.admin_users;
create policy "admin_users_select_full_access"
  on public.admin_users for select
  to authenticated
  using (public.is_full_access_admin());

-- Full-access admins can manage admin rows (optional future admin management UI).
drop policy if exists "admin_users_write_full_access" on public.admin_users;
create policy "admin_users_write_full_access"
  on public.admin_users for all
  to authenticated
  using (public.is_full_access_admin())
  with check (public.is_full_access_admin());

-- 4) organization_registry ---------------------------------------------------
drop policy if exists "org_registry_admin_select" on public.organization_registry;
drop policy if exists "org_registry_admin_insert" on public.organization_registry;
drop policy if exists "org_registry_admin_update" on public.organization_registry;
drop policy if exists "org_registry_admin" on public.organization_registry;
create policy "org_registry_admin"
  on public.organization_registry for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- 5) feature_flags -----------------------------------------------------------
drop policy if exists "feature_flags_admin_select" on public.feature_flags;
drop policy if exists "feature_flags_admin_update" on public.feature_flags;
drop policy if exists "feature_flags_admin_insert" on public.feature_flags;
drop policy if exists "feature_flags_admin" on public.feature_flags;
create policy "feature_flags_admin"
  on public.feature_flags for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- 6) organization_features ---------------------------------------------------
drop policy if exists "org_features_admin_select" on public.organization_features;
drop policy if exists "org_features_admin_write" on public.organization_features;
drop policy if exists "org_features_admin" on public.organization_features;
create policy "org_features_admin"
  on public.organization_features for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- Unique (organization_id, feature_id) enables admin upserts on organization_features.
-- organization_id → organization_registry.id; feature_id → feature_flags.id
-- See supabase/registry_schema.md
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'organization_features_org_feature_unique'
  ) then
    alter table public.organization_features
      add constraint organization_features_org_feature_unique
      unique (organization_id, feature_id);
  end if;
end $$;

-- 7) subscriptions / plans / invoices ----------------------------------------
-- subscription_invoices: read-only for admins (written by PowerTranz / backend).

drop policy if exists "subscriptions_admin_select" on public.subscriptions;
drop policy if exists "subscriptions_admin_insert" on public.subscriptions;
drop policy if exists "subscriptions_admin_update" on public.subscriptions;
drop policy if exists "subscriptions_admin" on public.subscriptions;
create policy "subscriptions_admin"
  on public.subscriptions for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

drop policy if exists "subscription_invoices_admin_select" on public.subscription_invoices;
drop policy if exists "subscription_invoices_admin" on public.subscription_invoices;
create policy "subscription_invoices_admin"
  on public.subscription_invoices for select
  to authenticated
  using (public.is_active_admin());

drop policy if exists "subscription_plans_admin_select" on public.subscription_plans;
drop policy if exists "subscription_plans_admin_insert" on public.subscription_plans;
drop policy if exists "subscription_plans_admin_update" on public.subscription_plans;
drop policy if exists "subscription_plans_admin" on public.subscription_plans;
create policy "subscription_plans_admin"
  on public.subscription_plans for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

drop policy if exists "subscription_plan_prices_admin_select" on public.subscription_plan_prices;
drop policy if exists "subscription_plan_prices_admin_insert" on public.subscription_plan_prices;
drop policy if exists "subscription_plan_prices_admin_update" on public.subscription_plan_prices;
drop policy if exists "subscription_plan_prices_admin" on public.subscription_plan_prices;
create policy "subscription_plan_prices_admin"
  on public.subscription_plan_prices for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

drop policy if exists "org_special_plans_admin_select" on public.organization_special_plans;
drop policy if exists "org_special_plans_admin_insert" on public.organization_special_plans;
drop policy if exists "org_special_plans_admin_update" on public.organization_special_plans;
drop policy if exists "org_special_plans_admin" on public.organization_special_plans;
create policy "org_special_plans_admin"
  on public.organization_special_plans for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- 8) Data API grants (PostgREST / supabase-js) ---------------------------------
-- RLS alone is not enough. Tables with "API DISABLED" in the dashboard lack
-- GRANTs for anon/authenticated — PostgREST returns 403 before RLS is evaluated.
-- The admin console uses the anon key + an authenticated JWT → role authenticated.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on public.organization_registry to authenticated;
grant select, insert, update, delete on public.feature_flags to authenticated;
grant select, insert, update, delete on public.organization_features to authenticated;
grant select, insert, update, delete on public.subscription_plans to authenticated;
grant select, insert, update, delete on public.subscription_plan_prices to authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert, update, delete on public.organization_special_plans to authenticated;
grant select on public.subscription_invoices to authenticated;
grant select on public.admin_users to authenticated;

-- Enum columns (billing_interval, admin_role) require USAGE on the type.
grant usage on type public.billing_interval to authenticated;
grant usage on type public.admin_role to authenticated;

-- ============================================================================
-- Seed an administrator
-- ----------------------------------------------------------------------------
-- 1. Authentication > Users > "Add user" (email + password) in the registry
--    Supabase project. Copy the new user's UUID.
-- 2. Insert the matching admin_users row:
--
--   insert into public.admin_users (id, email, role)
--   values ('<auth-user-uuid>', 'admin@example.com', 'full_access');
--
--   -- role can be 'standard' or 'full_access'.
-- ============================================================================
