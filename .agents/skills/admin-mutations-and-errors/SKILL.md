---
name: admin-mutations-and-errors
description: Handles TanStack Query mutations with user-facing feedback in tabstr-admin — sonner toasts, Postgres error codes, and query invalidation. Use when writing useMutation, onSuccess/onError handlers, or destructive-action UX.
---

# Admin Mutations & Errors

Every user-triggered mutation must give feedback on success **and** failure. Silent
`console.error` is not acceptable.

## Success + invalidate

```typescript
import { toast } from "sonner";

const mutation = useMutation({
  mutationFn: (input: CreateOrganizationInput) => organizationsService.create(input),
  onSuccess: (org) => {
    toast.success("Organization created", { description: org.organizationSlug });
    queryClient.invalidateQueries({ queryKey: queryKeys.organizations() });
  },
  onError: (error: Error & { code?: string }) => {
    if (error.code === "23505") {
      toast.error("Slug already exists", { description: "This slug is already registered." });
      return;
    }
    toast.error("Could not create organization", { description: error.message });
  },
});
```

This app is English-only — write strings directly (no i18n layer). Keep copy short and specific.

## Postgres error codes

| Code | Meaning |
|------|---------|
| `23503` | Foreign key violation |
| `23505` | Unique constraint violation |
| `42501` | Insufficient privilege (RLS denied the write) |

`42501` almost always means the `admin_users` row / RLS policy is missing — surface a clear
message rather than a generic one.

## Destructive actions

Use the shadcn `AlertDialog` for confirmation (e.g. deactivating an organization) — never
`window.confirm`. See `OrganizationStatusToggle.tsx`.

## Mutation status in components

Mutations expose `isPending` (v5). Return descriptive names from hooks and disable buttons:

```typescript
return { setActive: mutation.mutate, isUpdating: mutation.isPending };

<Button disabled={isUpdating}>
  {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
  Save
</Button>
```

## Anti-patterns

```typescript
// ❌ Silent failure
onError: (e) => console.error(e);
// ❌ Missing onError on user-facing mutations
// ❌ window.alert / window.confirm
```
