-- Sales seller attribution: member (auth.users) OR simple user (simple_users).
-- Requires public.simple_users (20_simple_users.sql).
-- Backwards compatible: sold_by_name is unchanged; sold_by becomes explicitly nullable.
-- New apps will use sold_by + sold_by_simple_user_id (mutually exclusive when populated).

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS sold_by_simple_user_id UUID
    REFERENCES public.simple_users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.sales.sold_by_name IS
  'Deprecated for new logic; kept for legacy Windows/Android builds. Dual-write until clients migrate.';

-- recommended for seller reports / filters
CREATE INDEX IF NOT EXISTS idx_sales_sold_by_simple_user_id
  ON public.sales (sold_by_simple_user_id)
  WHERE sold_by_simple_user_id IS NOT NULL;
