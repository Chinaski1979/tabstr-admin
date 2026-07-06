CREATE TABLE IF NOT EXISTS organization_memberships (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          role VARCHAR(20) DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier', 'accountant')),
          is_active BOOLEAN DEFAULT true,
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, organization_id)
        );

-- Create function to ensure profile exists before adding membership.
-- Anonymous users are skipped (they should not receive org memberships).
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_anonymous BOOLEAN;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id) THEN
    SELECT COALESCE(u.is_anonymous, false)
    INTO v_is_anonymous
    FROM auth.users u
    WHERE u.id = NEW.user_id;

    IF COALESCE(v_is_anonymous, false) THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.profiles (id, username, full_name, created_at, updated_at)
    SELECT
      NEW.user_id,
      COALESCE(NULLIF(trim(u.email), ''), 'user-' || u.id::text),
      COALESCE(
        NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''),
        NULLIF(trim(u.email), ''),
        'User'
      ),
      NOW(),
      NOW()
    FROM auth.users u
    WHERE u.id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to ensure profile exists when a user is added to an organization
DROP TRIGGER IF EXISTS ensure_profile_before_membership ON public.organization_memberships;
CREATE TRIGGER ensure_profile_before_membership
  BEFORE INSERT ON public.organization_memberships
  FOR EACH ROW EXECUTE FUNCTION public.ensure_profile_exists();

-- Enable Row Level Security
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "membership_policy" ON organization_memberships;
CREATE POLICY "membership_policy" ON organization_memberships
  FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);