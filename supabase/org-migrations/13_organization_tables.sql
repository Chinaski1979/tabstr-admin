-- Create table layout tables for organizations
CREATE TABLE IF NOT EXISTS public.organization_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  assigned_tab_id UUID NULL REFERENCES public.tabs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organization_tables_number_unique UNIQUE (organization_id, number)
);

CREATE INDEX IF NOT EXISTS idx_organization_tables_org ON public.organization_tables (organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_tables_tab ON public.organization_tables (assigned_tab_id);

-- Ensure we have a helper to maintain updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organization_tables_set_updated_at ON public.organization_tables;
CREATE TRIGGER organization_tables_set_updated_at
BEFORE UPDATE ON public.organization_tables
FOR EACH ROW
EXECUTE PROCEDURE public.set_updated_at();

-- Enable Row Level Security
ALTER TABLE public.organization_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organization_tables_policy" ON public.organization_tables;
CREATE POLICY "organization_tables_policy" ON public.organization_tables
  FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);


ALTER TABLE public.organization_tables
  ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL;