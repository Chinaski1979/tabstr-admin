CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(
  user_id UUID,
  org_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.organization_memberships 
    WHERE user_id = $1 
      AND organization_id = $2 
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;