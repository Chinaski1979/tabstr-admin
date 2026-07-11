-- Create rooms table for organizing tables by physical areas
CREATE TABLE IF NOT EXISTS public.organization_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organization_rooms_name_unique UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_organization_rooms_org ON public.organization_rooms (organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_rooms_active ON public.organization_rooms (organization_id, is_active);

-- Add room_id to organization_tables (nullable); enforce same-org via composite FK
ALTER TABLE public.organization_tables
  ADD COLUMN IF NOT EXISTS room_id UUID NULL;

-- Drop FKs on organization_tables BEFORE touching organization_rooms_org_id_key
-- (composite FK references organization_rooms(organization_id, id) and blocks constraint drops)
ALTER TABLE public.organization_tables
  DROP CONSTRAINT IF EXISTS organization_tables_org_room_fkey;

ALTER TABLE public.organization_tables
  DROP CONSTRAINT IF EXISTS organization_tables_room_id_fkey;

ALTER TABLE public.organization_tables
  DROP CONSTRAINT IF EXISTS organization_tables_organization_rooms_id_fkey;

-- Required for composite FK: organization_tables(organization_id, room_id) -> organization_rooms(organization_id, id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_rooms_org_id_key'
      AND conrelid = 'public.organization_rooms'::regclass
  ) THEN
    ALTER TABLE public.organization_rooms
      ADD CONSTRAINT organization_rooms_org_id_key UNIQUE (organization_id, id);
  END IF;
END $$;

-- Composite FK: room must belong to the same organization; RESTRICT so room must be empty before delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_tables_org_room_fkey'
      AND conrelid = 'public.organization_tables'::regclass
  ) THEN
    ALTER TABLE public.organization_tables
      ADD CONSTRAINT organization_tables_org_room_fkey
      FOREIGN KEY (organization_id, room_id)
      REFERENCES public.organization_rooms(organization_id, id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_organization_tables_room ON public.organization_tables (room_id);

-- Trigger for updated_at on rooms
DROP TRIGGER IF EXISTS organization_rooms_set_updated_at ON public.organization_rooms;
CREATE TRIGGER organization_rooms_set_updated_at
BEFORE UPDATE ON public.organization_rooms
FOR EACH ROW
EXECUTE PROCEDURE public.set_updated_at();

-- Enable Row Level Security
ALTER TABLE public.organization_rooms ENABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS "organization_rooms_policy" ON public.organization_rooms;
-- CREATE POLICY "organization_rooms_policy" ON public.organization_rooms
--   FOR ALL
--   TO authenticated, service_role
--   USING (true)
--   WITH CHECK (true);
