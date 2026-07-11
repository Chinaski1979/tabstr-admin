-- Allow 'accountant' on organization_memberships.role for existing databases.
-- Single DO block: exec_sql() passes one statement; PL/pgSQL EXECUTE cannot run multiple DDL strings in one call.

DO $migration$
BEGIN
  EXECUTE 'ALTER TABLE public.organization_memberships DROP CONSTRAINT IF EXISTS organization_memberships_role_check';
  EXECUTE $check$
    ALTER TABLE public.organization_memberships
    ADD CONSTRAINT organization_memberships_role_check
    CHECK (role IN ('admin', 'manager', 'cashier', 'accountant'))
  $check$;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;
