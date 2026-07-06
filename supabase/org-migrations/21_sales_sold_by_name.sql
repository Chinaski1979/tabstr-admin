-- Denormalized name used by salesService / reporting (sold_by stays UUID → auth.users).

ALTER TABLE sales ADD COLUMN IF NOT EXISTS sold_by_name VARCHAR(255);

ALTER TABLE cash_balances ADD COLUMN IF NOT EXISTS balanced_by_name VARCHAR(255);

-- Backfill sales: sold_by (user id) → profiles.full_name into sold_by_name.
UPDATE sales s
SET sold_by_name = trim(p.full_name)
FROM profiles p
WHERE s.sold_by IS NOT NULL
  AND s.sold_by = p.id
  AND (s.sold_by_name IS NULL OR trim(s.sold_by_name) = '');

-- Backfill cash_balances from profiles when available.
UPDATE cash_balances cb
SET balanced_by_name = trim(p.full_name)
FROM profiles p
WHERE cb.balanced_by IS NOT NULL
  AND cb.balanced_by = p.id
  AND (cb.balanced_by_name IS NULL OR trim(cb.balanced_by_name) = '');
