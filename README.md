# Tabstr Admin

Administration console for the **Tabstr registry**. Tabstr (the POS) connects to two
Supabase projects: each organization's tenant database and a central **registry** that
holds the list of organizations, their connection info, feature flags, and subscriptions.

This app connects **only to the registry** and lets Tabstr administrators:

- View all organizations, create new ones, and activate / deactivate them
- Toggle **global** feature flags and **per-organization** feature flags
- View subscriptions, plans, and billing history
- (Full access only) Revenue analytics and administrator management

## Stack

- **Vite + React 19 + TypeScript**
- **TanStack Query** for server state, **Zustand** for client/session state
- **Supabase JS** (registry project) for auth + data
- **shadcn/ui** (Radix + Tailwind v4) for UI, **sonner** for toasts
- **react-router** v7, **react-hook-form** + **zod** for forms

## Architecture

```
Component → Hook (useQuery/useMutation) → Service → getRegistryClient()
```

- Components never call Supabase directly — they consume hooks.
- Services own all DB access and snake_case → camelCase mapping.
- Query keys live in `src/lib/queryKeys.ts`; cache config in `src/lib/queryCacheConfig.ts`.
- Auth **session** lives in Zustand (`authStore`); the admin **role/profile** is server
  state loaded via TanStack Query (`useAdminProfile`).

See `.agents/skills/` for the conventions this project follows.

## Authentication & roles

Auth is Supabase email/password against the **registry** project. There are two admin tiers,
stored in the `admin_users` table:

| Role | Access |
|------|--------|
| `standard` | Organizations, feature flags, subscriptions |
| `full_access` | Everything above + Revenue + Administrator management |

A signed-in Supabase user only becomes an admin once an **active** `admin_users` row exists for them.

## Setup

1. **Install**

   ```bash
   npm install
   ```

2. **Configure env** — copy `.env.example` to `.env.local` and fill in the registry project URL
   and anon key (the same values Tabstr uses for `VITE_REGISTRY_SUPABASE_URL` /
   `VITE_REGISTRY_SUPABASE_ANON_KEY`).

   ```bash
   cp .env.example .env.local
   ```

3. **Run the registry SQL** — in the Supabase SQL editor of the registry project, run
   [`supabase/admin_setup.sql`](./supabase/admin_setup.sql). This creates `admin_users`, the
   `is_active_admin()` / `is_full_access_admin()` helpers, and the RLS policies that let the
   admin console read/write the registry with the anon key.

   Registry column names are documented in [`supabase/registry_schema.md`](./supabase/registry_schema.md).

4. **Create an administrator**
   - Supabase → Authentication → Users → *Add user* (email + password). Copy the user UUID.
   - In the SQL editor:

     ```sql
     insert into public.admin_users (id, email, role)
     values ('<auth-user-uuid>', 'you@example.com', 'full_access');
     ```

5. **Run**

   ```bash
   npm run dev
   ```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server (port 8081) |
| `npm run build` | Type-check + production build |
| `npm run typecheck` | Type-check only |
| `npm run lint` | ESLint |
| `npm run test` | Run tests (Vitest) |

## Security notes

- The client only ever holds the **anon key**. All writes are authorized by **RLS policies**
  scoped to active admins — never the service role.
- Deactivating an organization sets `organization_registry.is_active = false`; the POS filters
  on this flag, so the org can no longer connect.
- Creating an organization in this version inserts a registry row only (single-supabase model:
  paste the shared project URL + anon key). It does not provision a new Supabase project.
