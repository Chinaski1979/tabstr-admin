---
name: admin-react-components
description: Structures React components in tabstr-admin — folder layout, page/feature architecture, props/data flow, role gating, and shadcn composition. Use when creating or modifying components in src/components/ or src/pages/.
---

# Admin React Components

## Folder structure

```
src/
  pages/                # Route-level shells (one default export per route)
  components/
    ui/                 # shadcn primitives — no feature logic here
    layout/             # AppShell, Sidebar, Header
    auth/               # ProtectedRoute, AccessDenied
    common/             # StateViews, PageHeader (shared building blocks)
    organizations/      # Domain feature components
  hooks/                # Data hooks consumed by components
```

- **Pages** wire data + layout and delegate to feature components. Default export.
- **Feature components** are presentational where possible: data down, callbacks up.

## Data flow

```
Page → hook (useOrganizations, useFeatureFlags) → service
  ↓ props (data + callbacks)
Feature component
```

Pass permission flags as props/derived from `useAuth()` — don't re-check auth inside leaf
components when the route guard already did.

## Role gating

- Route-level: `<ProtectedRoute requiredRole="full_access" />` in `App.tsx`.
- Nav-level: the `Sidebar` filters items by `isFullAccess`.
- In-component: read `useAuth().isFullAccess` / `hasRole(...)` for conditional UI.

## Loading / error / empty

Use the shared `LoadingState`, `ErrorState`, `EmptyState`, `FullPageLoader` from
`@/components/common/StateViews`. Drive them off TanStack Query flags — never `data.length`.

```typescript
if (isLoading) return <LoadingState />;
if (error) return <ErrorState error={error} />;
if (items.length === 0) return <EmptyState title="No items" />;
```

## UI

Compose shadcn from `@/components/ui/`. Use semantic colors (`bg-primary`,
`text-muted-foreground`, `variant="success"`) and `flex` + `gap-*`. Use `Dialog` /
`AlertDialog` — not browser dialogs. Add new primitives under `ui/` only.

## Props

```typescript
interface OrganizationStatusToggleProps {
  organization: OrganizationRegistry;
}
```

Explicit `interface XxxProps`; required props first, optional last; callbacks named `onXxx`.

## Reference files

- Page: `src/pages/OrganizationsPage.tsx`
- Feature component: `src/components/organizations/OrganizationStatusToggle.tsx`
- Guard: `src/components/auth/ProtectedRoute.tsx`
- Shared states: `src/components/common/StateViews.tsx`
