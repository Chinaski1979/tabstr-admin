-- Bidirectional table-tab consistency:
-- - tabs.table_id
-- - organization_tables.tabs_ids (UUID[])
-- with atomic assignment RPC.

ALTER TABLE public.organization_tables
  ADD COLUMN IF NOT EXISTS tabs_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];

CREATE INDEX IF NOT EXISTS idx_organization_tables_tabs_ids
  ON public.organization_tables
  USING GIN (tabs_ids);

-- Backfill tabs_ids from current tabs.table_id relation (open tabs only).
UPDATE public.organization_tables AS ot
SET tabs_ids = COALESCE(agg.tab_ids, '{}'::uuid[]),
    assigned_tab_id = CASE
      WHEN COALESCE(array_length(agg.tab_ids, 1), 0) = 1 THEN agg.tab_ids[1]
      ELSE NULL
    END
FROM (
  SELECT
    t.table_id,
    array_agg(t.id ORDER BY t.created_at ASC) AS tab_ids
  FROM public.tabs t
  WHERE t.table_id IS NOT NULL
    AND t.is_open = true
  GROUP BY t.table_id
) AS agg
WHERE ot.id = agg.table_id;

-- Ensure tables with no open tabs have normalized values.
UPDATE public.organization_tables
SET tabs_ids = '{}'::uuid[],
    assigned_tab_id = NULL
WHERE id NOT IN (
  SELECT DISTINCT table_id
  FROM public.tabs
  WHERE table_id IS NOT NULL
    AND is_open = true
);

CREATE OR REPLACE FUNCTION public.assign_tabs_to_table_atomic(
  p_table_id UUID,
  p_tab_ids UUID[]
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  number INTEGER,
  position_x INTEGER,
  position_y INTEGER,
  width INTEGER,
  height INTEGER,
  assigned_tab_id UUID,
  tabs_ids UUID[],
  room_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tab_ids UUID[] := COALESCE(p_tab_ids, '{}'::uuid[]);
  v_affected_tables UUID[];
  v_table UUID;
  v_open_tab_ids UUID[];
BEGIN
  -- Lock target table row.
  PERFORM 1
  FROM public.organization_tables ot
  WHERE ot.id = p_table_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'organization_tables row not found for p_table_id=%', p_table_id;
  END IF;

  IF array_length(v_tab_ids, 1) IS NOT NULL THEN
    PERFORM 1
    FROM public.tabs t
    WHERE t.id = ANY(v_tab_ids)
    ORDER BY t.id
    FOR UPDATE;
  END IF;

  -- Tables currently owning requested tabs.
  SELECT COALESCE(array_agg(DISTINCT t.table_id), '{}'::uuid[])
  INTO v_affected_tables
  FROM public.tabs t
  WHERE t.id = ANY(v_tab_ids)
    AND t.table_id IS NOT NULL
    AND t.table_id <> p_table_id;

  IF array_length(v_affected_tables, 1) IS NOT NULL THEN
    PERFORM 1
    FROM public.organization_tables ot
    WHERE ot.id = ANY(v_affected_tables)
    ORDER BY ot.id
    FOR UPDATE;
  END IF;

  -- Tabs removed from target table.
  UPDATE public.tabs t
  SET table_id = NULL
  WHERE t.table_id = p_table_id
    AND (array_length(v_tab_ids, 1) IS NULL OR NOT (t.id = ANY(v_tab_ids)));

  -- Detach requested tabs from previous tables first.
  IF array_length(v_tab_ids, 1) IS NOT NULL THEN
    UPDATE public.tabs t
    SET table_id = NULL
    WHERE t.id = ANY(v_tab_ids)
      AND t.table_id IS NOT NULL
      AND t.table_id <> p_table_id;

    UPDATE public.tabs t
    SET table_id = p_table_id
    WHERE t.id = ANY(v_tab_ids);
  END IF;

  -- Recompute tabs_ids + assigned_tab_id for affected tables and target.
  FOR v_table IN
    SELECT DISTINCT unnest(v_affected_tables || ARRAY[p_table_id]::uuid[])
  LOOP
    SELECT COALESCE(array_agg(t.id ORDER BY t.created_at ASC), '{}'::uuid[])
    INTO v_open_tab_ids
    FROM public.tabs t
    WHERE t.table_id = v_table
      AND t.is_open = true;

    UPDATE public.organization_tables ot
    SET tabs_ids = v_open_tab_ids,
        assigned_tab_id = CASE
          WHEN COALESCE(array_length(v_open_tab_ids, 1), 0) = 1 THEN v_open_tab_ids[1]
          ELSE NULL
        END
    WHERE ot.id = v_table;
  END LOOP;

  RETURN QUERY
  SELECT
    ot.id,
    ot.organization_id,
    ot.number,
    ot.position_x,
    ot.position_y,
    ot.width,
    ot.height,
    ot.assigned_tab_id,
    ot.tabs_ids,
    ot.room_id,
    ot.created_at,
    ot.updated_at
  FROM public.organization_tables ot
  WHERE ot.id = p_table_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_tabs_to_table_atomic(UUID, UUID[]) TO authenticated, service_role;
