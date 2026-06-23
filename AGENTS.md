# tabstr-admin — agent guide

Admin console for the Tabstr **registry** Supabase project (organizations, feature flags,
subscriptions). Connects only to the registry, with the anon key + RLS scoped to admins.

## Conventions (read the skill before working in that area)

- `.agents/skills/admin-data-layer` — service → hook → component, queryKeys, query status
- `.agents/skills/admin-state-boundaries` — TanStack Query (server) vs Zustand (auth session)
- `.agents/skills/admin-supabase-registry` — single registry client, auth, `admin_users`, RLS
- `.agents/skills/admin-mutations-and-errors` — sonner toasts, PG error codes, confirm dialogs
- `.agents/skills/admin-react-components` — folders, role gating, shared state views, shadcn
- `.agents/skills/admin-typescript` — pragmatic typing, domain types, path alias
- `.agents/skills/admin-testing` — Vitest + RTL

## Key facts

- Two admin tiers in `admin_users.role`: `standard`, `full_access`.
- Registry schema + RLS lives in `supabase/admin_setup.sql` (run on the registry project).
- The client only ever holds the anon key — never the service role. RLS is the auth boundary.
- Creating an org inserts an `organization_registry` row only (single-supabase model).
