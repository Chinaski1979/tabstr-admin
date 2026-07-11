-- Add table_id relation for supporting multiple tabs per table.
ALTER TABLE public.tabs
  ADD COLUMN IF NOT EXISTS table_id UUID NULL;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tabs_table_id_fkey'
      AND conrelid = 'public.tabs'::regclass
  ) THEN
    ALTER TABLE public.tabs
      ADD CONSTRAINT tabs_table_id_fkey
      FOREIGN KEY (table_id)
      REFERENCES public.organization_tables(id)
      ON DELETE SET NULL;
  END IF;
END
$migration$;

CREATE INDEX IF NOT EXISTS idx_tabs_table_id ON public.tabs (table_id);

-- Initial backfill for existing single-table assignments.
UPDATE public.tabs AS t
SET table_id = ot.id
FROM public.organization_tables AS ot
WHERE ot.assigned_tab_id = t.id
  AND t.table_id IS NULL;
