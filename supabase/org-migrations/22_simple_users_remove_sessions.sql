-- Remove anonymous simple-user sessions; PIN validation is client-side with member JWT.
-- Drops simple_user_sessions, related SECURITY DEFINER functions, and tightens simple_users SELECT RLS.
-- TODO: I think this migration can be deleted.
-- Keeping this file for documentation purposes only. will delete later afer we are 100% sure that we don't need it.

-- DROP POLICY IF EXISTS "simple_users_admin_select" ON public.simple_users;
-- DROP POLICY IF EXISTS "simple_users_org_switching_select" ON public.simple_users;

-- DROP FUNCTION IF EXISTS public.simple_user_linked_organization_ids();

-- DROP FUNCTION IF EXISTS public.get_simple_user_safe(uuid);

-- DROP FUNCTION IF EXISTS public.link_simple_user_session(uuid, text);

-- DROP POLICY IF EXISTS "simple_user_sessions_own_select" ON public.simple_user_sessions;

-- DROP TABLE IF EXISTS public.simple_user_sessions;

-- CREATE POLICY "simple_users_org_switching_select" ON public.simple_users
--   FOR SELECT
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1
--       FROM public.organization_memberships m
--       WHERE m.user_id = auth.uid()
--         AND m.organization_id = simple_users.organization_id
--         AND m.is_active = true
--     )
--   );

-- DROP FUNCTION IF EXISTS public.list_simple_users_for_org_switch(uuid, boolean);
