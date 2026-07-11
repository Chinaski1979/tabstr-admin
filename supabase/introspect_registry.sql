-- Optional: introspect any registry table when runtime errors suggest a schema mismatch.
-- Verified columns belong in supabase/registry_schema.md — update that file after running this.

-- 1) Columns on organization_features
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'organization_features'
ORDER BY ordinal_position;

-- 2) Foreign keys on organization_features (which column points to which table)
SELECT
  kcu.column_name AS fk_column,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'organization_features';

-- 3) Unique constraints / indexes on organization_features (for upsert onConflict)
SELECT conname AS constraint_name, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.organization_features'::regclass
  AND contype IN ('u', 'p');


-- 4) New Columns on organization_plans
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS features text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.organization_special_plans
  ADD COLUMN IF NOT EXISTS features text[] NOT NULL DEFAULT '{}';