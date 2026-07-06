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
| `npm run migrate` | Run database migrations on all active organizations |
| `npm run provision-org` | Provision a new organization (interactive wizard) |

## Organization Provisioning

This project includes CLI tools for provisioning complete organizations with database migrations, admin users, and default data.

### Provisioning a New Organization

The provisioning system supports two modes:

1. **New project (with migrations)**: Applies all 28 SQL migrations to set up a complete Tabstr database schema
2. **Existing project**: Skips migrations, only registers the org and sets up admin user + default data

#### Interactive Mode

```bash
npm run provision-org
```

You'll be prompted for:
- **Admin user**: email, password, full name
- **Organization**: name and slug (auto-generated from name)
- **Database**: Supabase URL, anon key, service role key
- **Mode**: whether to skip migrations (for existing projects)

#### Non-Interactive Mode

```bash
npm run provision-org -- \
  --email admin@example.com \
  --password secret123 \
  --full-name "Admin User" \
  --org-name "Mi Restaurant" \
  --slug mi-restaurant \
  --supabase-url https://xxx.supabase.co \
  --anon-key eyJ... \
  --service-key eyJ... \
  --skip-migrations  # optional, for existing projects
```

#### Prerequisites for New Projects

Before provisioning a new project, you must create the `exec_sql` function in the target Supabase project. Run this SQL in the SQL Editor:

```sql
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
```

Or use the template: [`scripts/templates/exec_sql.sql`](scripts/templates/exec_sql.sql)

The function is automatically dropped after provisioning for security.

### Migrating Existing Organizations

To apply schema changes to all active organizations:

```bash
npm run migrate
```

To migrate specific organizations:

```bash
npm run migrate -- --target-organizations=org1,org2,org3
```

To preview changes without applying them:

```bash
npm run migrate -- --dry-run
```

#### Configuration

Add service role keys to `.env.local` (not committed):

```bash
# Registry service role (for scripts to list orgs)
REGISTRY_SERVICE_ROLE_KEY=your_registry_service_role_key

# Organization service keys (format: SERVICE_KEY_<SLUG_UPPERCASE>)
SERVICE_KEY_MI_RESTAURANT=eyJ...
SERVICE_KEY_OTRO_CLIENTE=eyJ...
```

The migration system:
- Tracks applied migrations in a `migration_history` table in each org DB
- Only applies migrations that haven't been run yet
- Generates detailed reports in `migration-reports/`
- Supports dry-run mode for preview

### Error Handling

The provisioning system provides detailed error messages for common issues:

- **Slug already exists**: The system will suggest alternatives
- **exec_sql not found**: Shows the exact SQL to create the function
- **Migration failures**: Logs which migration failed and why
- **Credential mismatches**: Validates that URL, anon key, and service key match

See the [Organization Provisioning System plan](.cursor/plans/) for complete technical details.

## Security notes

- The client only ever holds the **anon key**. All writes are authorized by **RLS policies**
  scoped to active admins — never the service role.
- Deactivating an organization sets `organization_registry.is_active = false`; the POS filters
  on this flag, so the org can no longer connect.
- Creating an organization in this version inserts a registry row only (single-supabase model:
  paste the shared project URL + anon key). It does not provision a new Supabase project.
