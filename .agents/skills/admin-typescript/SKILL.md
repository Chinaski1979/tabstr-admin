---
name: admin-typescript
description: TypeScript conventions for tabstr-admin — pragmatic typing with strict mode off, domain types, path aliases, and props interfaces. Use when writing types, interfaces, hooks, or services.
---

# Admin TypeScript

## Project config

From `tsconfig.app.json`:
- `strict: false`, `noImplicitAny: false`, `strictNullChecks: false` — pragmatic, matches tabstr.
  Avoid adding **new** `any`, but don't fight the compiler.
- Path alias `@/*` → `src/*`. Always use it; no deep relative imports.

## Type organization

| Location | Use for |
|----------|---------|
| `src/types/index.ts` | Shared domain types (OrganizationRegistry, FeatureFlag, AdminUser, Subscription, …) |
| Store file `*.types.ts` | Store state + action types |
| Component file | Props interface only (`XxxProps`) |

```typescript
// ✅ Domain type in src/types, mapped from DB rows in the service
export interface OrganizationRegistry {
  id: string;
  organizationSlug: string;
  isActive: boolean;
  createdAt: Date;
}

// ❌ Inline DB row shapes in hooks
const { data } = useQuery<{ organization_slug: string }[]>(...);
```

## Services & hooks

- Services accept/return **domain types** (camelCase). Keep the `mapRow(row: any)` mapper local
  to the service; that is the one acceptable `any`.
- Use `Omit<...>` or dedicated `CreateXxxInput` types for create inputs.
- Type query/mutation generics: `useQuery<OrganizationRegistry[]>({ ... })`.

## Exports

| Pattern | Use for |
|---------|---------|
| `export default` | Route pages |
| Named `export function` | Hooks, components |
| Named `export const` | Services, stores, constants |

## Anti-patterns

```typescript
// ❌ new any in feature code
function handle(data: any) {}
// ❌ @ts-ignore instead of fixing the type
// ❌ duplicating types that already live in @/types
```
