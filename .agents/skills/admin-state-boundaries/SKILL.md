---
name: admin-state-boundaries
description: Separates server state (TanStack Query) from client state (Zustand) in tabstr-admin. Use when adding global state, stores, auth/session handling, or deciding where data should live.
---

# Admin State Boundaries

## The rule

| State type | Tool | Examples |
|------------|------|----------|
| **Server data** | TanStack Query | organizations, feature flags, subscriptions, admin profile/role |
| **Client/session data** | Zustand | Supabase auth session + user |

When unsure: if it comes from the registry → **Query**. If it's session/UI-only → **Zustand**.

## Auth specifically

- The Supabase **session + user** live in `authStore` (Zustand). `AuthProvider` keeps it in
  sync via `supabase.auth.onAuthStateChange`.
- The admin **role/profile** (`admin_users` row) is **server state** — loaded with
  `useAdminProfile` (TanStack Query). Never duplicate the role into Zustand.
- `useAuth()` combines both and exposes `isAuthenticated`, `isActiveAdmin`, `isFullAccess`,
  `hasRole(role)`, `signIn`, `signOut`.

```typescript
// ✅ Role comes from the query-backed hook
const { isFullAccess, hasRole } = useAuth();

// ❌ Don't store the role in Zustand
useAuthStore.setState({ role: "full_access" });
```

## Stores

Location: `src/stores/`. Follow the `authStore` structure:

```
stores/
  auth/auth.types.ts     # State + action types
  authStore.ts           # create() + devtools middleware
```

Use `devtools`. Only `persist` fields that must survive refresh (Supabase already persists
its own session via the client `storageKey`).

## When a store action touches server data

Pass `queryClient` in and invalidate keys — don't import hooks into store files. On sign-out,
`AuthProvider` calls `queryClient.clear()` so no stale registry data leaks across accounts.

## Anti-patterns

```typescript
// ❌ Duplicate server data in component state
const [orgs, setOrgs] = useState([]); // useOrganizations() exists

// ❌ useEffect fetch instead of useQuery
useEffect(() => { fetchOrgs().then(setOrgs); }, []);
```
