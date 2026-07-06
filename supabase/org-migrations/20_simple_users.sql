-- Simple users: minimal flow for PIN login + cashier behavior.
-- PIN is intentionally stored as plain text (4 digits) per product decision.

CREATE TABLE IF NOT EXISTS public.simple_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL,
  pin TEXT NOT NULL CHECK (pin ~ '^\d{4}$'),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_username_per_org UNIQUE(organization_id, username)
);

ALTER TABLE public.simple_users
  ALTER COLUMN created_by SET DEFAULT auth.uid();

ALTER TABLE public.simple_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "simple_users_admin_manager_insert" ON public.simple_users;
CREATE POLICY "simple_users_admin_manager_insert" ON public.simple_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_memberships m
      WHERE m.user_id = auth.uid()
        AND m.organization_id = simple_users.organization_id
        AND m.role IN ('admin', 'manager')
        AND m.is_active = true
    )
    AND simple_users.created_by = auth.uid()
  );

DROP POLICY IF EXISTS "simple_users_admin_update" ON public.simple_users;
CREATE POLICY "simple_users_admin_update" ON public.simple_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships m
      WHERE m.user_id = auth.uid()
        AND m.organization_id = simple_users.organization_id
        AND m.role IN ('admin', 'manager')
        AND m.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_memberships m
      WHERE m.user_id = auth.uid()
        AND m.organization_id = simple_users.organization_id
        AND m.role IN ('admin', 'manager')
        AND m.is_active = true
    )
  );

DROP POLICY IF EXISTS "simple_users_admin_delete" ON public.simple_users;
CREATE POLICY "simple_users_admin_delete" ON public.simple_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships m
      WHERE m.user_id = auth.uid()
        AND m.organization_id = simple_users.organization_id
        AND m.role IN ('admin', 'manager')
        AND m.is_active = true
    )
  );

CREATE OR REPLACE FUNCTION public.create_simple_user(
  p_username TEXT,
  p_pin TEXT,
  p_organization_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_username IS NULL OR length(trim(p_username)) < 1 THEN
    RAISE EXCEPTION 'Username required';
  END IF;

  IF p_pin IS NULL OR p_pin !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = auth.uid()
      AND organization_id = p_organization_id
      AND role IN ('admin', 'manager')
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only admins or managers can create simple users';
  END IF;

  INSERT INTO public.simple_users (organization_id, username, pin, created_by)
  VALUES (p_organization_id, trim(p_username), p_pin, auth.uid())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_simple_user_pin(
  p_simple_user_id UUID,
  p_new_pin TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  IF p_new_pin IS NULL OR p_new_pin !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits';
  END IF;

  SELECT organization_id INTO v_org_id
  FROM public.simple_users
  WHERE id = p_simple_user_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Simple user not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = auth.uid()
      AND organization_id = v_org_id
      AND role IN ('admin', 'manager')
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only admins or managers can reset PINs';
  END IF;

  UPDATE public.simple_users
  SET pin = p_new_pin,
      updated_at = NOW()
  WHERE id = p_simple_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_simple_user_id_by_username(
  p_organization_slug TEXT,
  p_username TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_org_id UUID;
  v_id UUID;
BEGIN
  SELECT o.id INTO v_org_id
  FROM public.organizations o
  WHERE lower(trim(o.slug)) = lower(trim(p_organization_slug))
    AND o.is_active = true
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT su.id INTO v_id
  FROM public.simple_users su
  WHERE su.organization_id = v_org_id
    AND lower(trim(su.username)) = lower(trim(p_username))
    AND su.is_active = true
  LIMIT 1;

  RETURN v_id;
END;
$$;

-- Fast Switch list visibility for active organization members.
DROP POLICY IF EXISTS "simple_users_org_switching_select" ON public.simple_users;

CREATE POLICY "simple_users_org_switching_select" ON public.simple_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_memberships m
      WHERE m.user_id = auth.uid()
        AND m.organization_id = simple_users.organization_id
        AND m.is_active = true
    )
  );

GRANT EXECUTE ON FUNCTION public.create_simple_user(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_simple_user_pin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_simple_user_id_by_username(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_simple_user_id_by_username(TEXT, TEXT) TO authenticated;
