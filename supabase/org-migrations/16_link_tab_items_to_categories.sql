-- 1. Add the new column with Foreign Key reference
ALTER TABLE tab_items 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL;

-- 2. Migrate existing data
-- This attempts to find a matching category by name.
UPDATE tab_items ti
SET category_id = pc.id
FROM product_categories pc
WHERE ti.product_category = pc.name;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_tab_items_category_id ON tab_items(category_id);
