---
name: admin-testing
description: Writes Vitest + React Testing Library tests for tabstr-admin components and hooks. Use when adding or modifying tests, mocking hooks/stores/services, or setting up test utilities.
---

# Admin Testing

Stack: **Vitest + Vite + React Testing Library** (jsdom via `src/setupTests.ts`).

```bash
npm run test            # run once
npm run test:watch      # watch mode
```

## File location

Co-locate tests with source:
- `src/components/__tests__/MyComponent.test.tsx`
- `src/hooks/__tests__/useMyHook.test.ts`

## Mock at the boundary

Mock services / hooks with `vi.mock`. Use `vi.hoisted` for values referenced inside factories.

```typescript
const { mockGetAll } = vi.hoisted(() => ({ mockGetAll: vi.fn() }));
vi.mock("@/services/organizations/organizationsService", () => ({
  organizationsService: { getAll: mockGetAll },
}));
```

Partial mocks — spread the real module (e.g. for `react-router` Navigate):

```typescript
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} /> };
});
```

## Wrap queries in a fresh QueryClient

```typescript
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
render(
  <QueryClientProvider client={client}>
    <ComponentUnderTest />
  </QueryClientProvider>,
);
```

## What to test

- Route guards and role-based access (`ProtectedRoute`, `useAuth().hasRole`)
- Hook logic with mocked services
- Loading / error / empty states
- User interactions (forms, toggles, confirm dialogs)

## What not to test

- shadcn/ui primitives
- Real Supabase integration (mock services instead)

## Anti-patterns

```typescript
// ❌ jest.* APIs (use vi.*)
// ❌ vi.mock inside describe/it (must be top-level)
// ❌ importing the real registry client without mocking the service
```
