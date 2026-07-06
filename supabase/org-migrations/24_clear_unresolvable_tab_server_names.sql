-- Clear tabs.server_name when the stored label cannot be resolved to a current
-- org member or simple user (open tabs only).
--
-- Why: PR #473 resolves seller FKs from tabs.server_name at checkout. Legacy tabs
-- may have stale labels (renamed profile, deactivated user, pre-dropdown free text).
-- Clearing server_name lets checkout use the current POS operator — same as tabs
-- that never had server_name persisted.
--
-- Safe to re-run: only updates rows that still fail resolution.

-- 1) Optional preview (run manually before migrate):
-- SELECT t.id, t.customer_name, t.server_name, t.organization_id, t.created_at
-- FROM public.tabs t
-- WHERE t.is_open = true
--   AND NULLIF(trim(t.server_name), '') IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1
--     FROM public.organization_memberships om
--     JOIN public.profiles p ON p.id = om.user_id
--     WHERE om.organization_id = t.organization_id
--       AND om.is_active = true
--       AND (
--         trim(p.full_name) = trim(t.server_name)
--         OR trim(p.username) = trim(t.server_name)
--       )
--   )
--   AND NOT EXISTS (
--     SELECT 1
--     FROM public.simple_users su
--     WHERE su.organization_id = t.organization_id
--       AND su.is_active = true
--       AND trim(su.username) = trim(t.server_name)
--   );

-- 2) Normalize case-only mismatches so attribution stays on the original server.
UPDATE public.tabs AS t
SET
  server_name = matched.canonical_name,
  updated_at = NOW()
FROM (
  SELECT
    t2.id AS tab_id,
    COALESCE(NULLIF(trim(p.full_name), ''), trim(p.username)) AS canonical_name
  FROM public.tabs t2
  JOIN public.organization_memberships om
    ON om.organization_id = t2.organization_id
   AND om.is_active = true
  JOIN public.profiles p ON p.id = om.user_id
  WHERE t2.is_open = true
    AND NULLIF(trim(t2.server_name), '') IS NOT NULL
    AND lower(trim(t2.server_name)) = lower(trim(COALESCE(p.full_name, p.username)))
    AND trim(t2.server_name) <> trim(COALESCE(NULLIF(trim(p.full_name), ''), trim(p.username)))
) AS matched
WHERE t.id = matched.tab_id;

-- 3) Clear server_name when it still cannot be resolved (stale / unknown label).
UPDATE public.tabs AS t
SET
  server_name = NULL,
  updated_at = NOW()
WHERE t.is_open = true
  AND NULLIF(trim(t.server_name), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    JOIN public.profiles p ON p.id = om.user_id
    WHERE om.organization_id = t.organization_id
      AND om.is_active = true
      AND (
        trim(p.full_name) = trim(t.server_name)
        OR trim(p.username) = trim(t.server_name)
      )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.simple_users su
    WHERE su.organization_id = t.organization_id
      AND su.is_active = true
      AND trim(su.username) = trim(t.server_name)
  );
