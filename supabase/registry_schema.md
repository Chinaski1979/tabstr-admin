# Registry database schema (reference)

Column names used by tabstr-admin must match the **live registry** Supabase project.
This file is the source of truth for services and SQL in this repo.

## Verified against production

### `organization_features`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid | PK |
| `organization_id` | uuid | FK → `organization_registry.id` |
| `feature_id` | uuid | FK → `feature_flags.id` |
| `active` | boolean | Per-org toggle |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Unique: `(organization_id, feature_id)` — required for admin upserts.

## From tabstr docs / working POS queries (confirm if your registry diverged)

### `organization_registry`

Documented in tabstr `MULTI_DB.md` and used by `RegistryClient`:

`id`, `organization_slug`, `supabase_url`, `supabase_anon_key`, `is_active`, `created_at`, `updated_at`

### `feature_flags`

Read by tabstr `featureFlagsService` (no CREATE TABLE in tabstr repo):

`id`, `feature_name`, `is_enabled`, `is_paid`, `plan_name`, `created_at`, `updated_at`

### Subscription tables

CREATE TABLE definitions in tabstr `docs/SUBSCRIPTIONS_POWERTRANZ_REGISTRY.md`:

- `subscription_plans`: `id`, `plan_name`, …
- `subscription_plan_prices`: `plan_id`, `billing_interval`, `plan_price`, `is_active`, …
- `organization_special_plans`: `organization_registry_id`, `special_plan_name`, `special_price`, `is_active`, …
- `subscriptions`: `organization_registry_id`, `plan_id`, `special_plan_id`, `powertranz_subscription_id`, `status`, …
- `subscription_invoices`: `subscription_id`, `amount`, `currency`, `status`, `powertranz_transaction_id`, `processed_at`, …

Note: subscription tables use `organization_registry_id`; only `organization_features` uses `organization_id` for the same FK target.

### `admin_users` (created by `admin_setup.sql`)

`id` (→ auth.users), `email`, `role`, `is_active`, `created_at`

### `platform_messages` (created by `platform_messages.sql`)

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid | PK |
| `organization_registry_id` | uuid | FK → `organization_registry.id`; **NULL = global** |
| `message_text` | text | Banner text |
| `expires_at` | timestamptz | Auto-hide after this time |
| `is_active` | boolean | Admin toggle |
| `is_urgent` | boolean | Red styling in POS |
| `is_dismissible` | boolean | When false, POS users cannot dismiss |
| `created_by` | uuid | FK → auth.users |
| `created_at` / `updated_at` | timestamptz | |

## If something fails at runtime

Run `supabase/introspect_registry.sql` on the registry and update this file + the affected service.
