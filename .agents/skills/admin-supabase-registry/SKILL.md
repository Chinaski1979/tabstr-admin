---
name: admin-supabase-registry
description: Configures and queries the registry Supabase project in tabstr-admin, including auth, the admin_users role model, and RLS policies. Use when writing database queries, auth integration, or RLS for the registry.
---

# Admin Supabase (Registry)

## Single client, registry only

This app connects to **one** Supabase project: the central registry. It never connects to
per-organization tenant databases.

```typescript
// ✅ Always use the wrapper
import { getRegistryClient } from "@/integrations/supabase/client";
const supabase = getRegistryClient();

// ❌ Never create clients inline
const supabase = createClient(url, key);
```

The client holds the **anon key only** — never the service role (this is a browser app).

## Where Supabase code lives

| Layer | Location | Allowed? |
|-------|----------|----------|
| Services | `src/services/*/` | ✅ all queries/mutations |
| Hooks | `src/hooks/` | ❌ no direct calls |
| Components | `src/components/`, `src/pages/` | ❌ never |
| Providers | `src/providers/` | ⚠️ auth bootstrap only (`AuthProvider`) |

## Auth & the role model

- Email/password against the registry project (`authService`).
- A signed-in user is only an admin if an **active** `admin_users` row exists for them.
- Two tiers via `admin_users.role`: `standard` and `full_access`.
- `useAuth()` exposes `isActiveAdmin`, `isFullAccess`, `hasRole(role)`. `full_access` satisfies
  `standard` in `hasRole`.

## RLS is the authorization boundary

Because all writes go through the anon key + an authenticated session, **RLS policies are the
only thing protecting the registry**. Policies use SECURITY DEFINER helpers to avoid recursion:

```sql
-- is_active_admin() / is_full_access_admin() are SECURITY DEFINER and read admin_users
create policy "org_registry_admin_update"
  on public.organization_registry for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());
```

Rules:
- Every admin-writable registry table needs explicit `select` + write policies scoped to
  `public.is_active_admin()` (or `is_full_access_admin()` for sensitive data).
- Keep all policy/schema changes in `supabase/admin_setup.sql`, idempotent and documented.
- Never disable RLS to "make it work" — add/fix the policy instead.
- Tables the POS writes (subscriptions, invoices) are **read-only** here.

## Service query pattern

```typescript
export const featureFlagsService = {
  async getAll(): Promise<FeatureFlag[]> {
    const supabase = getRegistryClient();
    const { data, error } = await supabase
      .from("feature_flags")
      .select(FLAG_SELECT)
      .order("feature_name");
    if (error) throw error;
    return (data ?? []).map(mapFlag);
  },
};
```

- Use explicit `.select()` columns/joins; avoid `select("*")` when joining.
- Throw errors — don't return `{ data, error }` tuples to callers.

## Reference files

- Client: `src/integrations/supabase/client.ts`
- Registry SQL (tables + RLS): `supabase/admin_setup.sql`
- Auth bootstrap: `src/providers/AuthProvider.tsx`, `src/stores/authStore.ts`
