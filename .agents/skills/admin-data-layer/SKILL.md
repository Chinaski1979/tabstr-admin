---
name: admin-data-layer
description: Implements tabstr-admin data fetching and mutations using the service → hook → component pattern with TanStack Query, centralized queryKeys, queryCacheConfig, and correct loading/empty/error UI states. Use when adding or modifying hooks, services, query keys, cache invalidation, or any registry data flow in src/hooks/ or src/services/.
---

# Admin Data Layer

## Architecture

```
Component → Hook (useQuery/useMutation) → Service → getRegistryClient()
```

- **Components never call Supabase.** They consume hooks.
- **Services** own all DB access and snake_case → camelCase mapping.
- **Hooks** are thin wrappers around services with centralized keys + cache config.

Unlike the POS, this app is single-tenant (one registry project), so hooks do **not**
take an `orgId` for scoping — they query the registry directly. Pass an entity id
(e.g. `orgRegistryId`) only when fetching data for a specific organization.

## Query keys

Always use `queryKeys` from `@/lib/queryKeys`. Add a key there before using it.

```typescript
// ✅
queryKey: queryKeys.organizations()
queryKey: queryKeys.organizationFeatures(orgRegistryId)

// ❌ ad-hoc keys break invalidation
queryKey: ["organizations"]
```

## Hook pattern

```typescript
export function useOrganizations() {
  const { data: organizations = [], isPending: isLoading, error } = useQuery<OrganizationRegistry[]>({
    queryKey: queryKeys.organizations(),
    queryFn: () => organizationsService.getAll(),
    staleTime: STALE_TIME.organizations,
  });
  return { organizations, isLoading, error };
}
```

Conventions:
1. Alias `isPending` as `isLoading` when returning to components (v5 — see below).
2. Default `data` to `[]` or `null`.
3. Set `enabled: !!id` for entity-scoped queries (e.g. `useOrganization(id)`).
4. Apply a `staleTime` from `@/lib/queryCacheConfig`.

## Service pattern

```typescript
export const organizationsService = {
  async getAll(): Promise<OrganizationRegistry[]> {
    const supabase = getRegistryClient();
    const { data, error } = await supabase
      .from("organization_registry")
      .select(SELECT)
      .order("organization_slug");
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },
};
```

- Export a plain object with async methods (not a class).
- Always `if (error) throw error` — let hooks handle UX.
- Map DB rows → domain types in the service.

## isPending vs isLoading (TanStack Query v5)

| Flag | Meaning | Use |
|------|---------|-----|
| `isPending` | No cached data yet (incl. disabled queries) | Primary loading signal — alias as `isLoading` |
| `isFetching` | Any in-flight request incl. background refetch | Subtle refresh indicator only |
| `isError` / `error` | Query failed | Error UI |

A list has **three distinct UI states** — never infer loading from `data.length`:

```typescript
if (isLoading) return <LoadingState />;
if (error) return <ErrorState error={error} />;
if (items.length === 0) return <EmptyState title="…" />;
return <List items={items} />;
```

Use the shared `LoadingState` / `ErrorState` / `EmptyState` from
`@/components/common/StateViews`.

## Mutations

```typescript
const mutation = useMutation({
  mutationFn: (input: CreateOrganizationInput) => organizationsService.create(input),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.organizations() }),
});
return { createOrganization: mutation.mutateAsync, isCreating: mutation.isPending };
```

Invalidate every affected key on success. For user feedback, see `admin-mutations-and-errors`.

## Checklist for new features

1. Add type in `src/types/`
2. Add service method in `src/services/<domain>/`
3. Add query key in `src/lib/queryKeys.ts`
4. Add hook in `src/hooks/`
5. Consume hook in component — no direct service imports in components
