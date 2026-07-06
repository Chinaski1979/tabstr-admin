CREATE TABLE IF NOT EXISTS profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          username VARCHAR(255) NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

-- Create trigger function to automatically create profiles for new users.
-- Anonymous Auth users (PIN / simple-user) do not get a profile row.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_full_name TEXT;
BEGIN
  IF COALESCE(NEW.is_anonymous, false) THEN
    RETURN NEW;
  END IF;

  v_username := COALESCE(NULLIF(trim(NEW.email), ''), 'user-' || NEW.id::text);
  v_full_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.email), ''),
    'User'
  );

  INSERT INTO public.profiles (id, username, full_name, created_at, updated_at)
  VALUES (NEW.id, v_username, v_full_name, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- -- Create trigger to automatically create profiles when new auth users are created
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "profile_policy" ON profiles;
CREATE POLICY "profile_policy" ON profiles
  FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);