-- Step 1: Ensure table exists
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  show_in_sales BOOLEAN DEFAULT true,
  print_in_kitchen BOOLEAN DEFAULT false,
  print_in_bar BOOLEAN DEFAULT false,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, organization_id)
);

-- Step 2: Migrate existing categories from products.category to product_categories
-- Only creates categories with name and organization_id, all other fields use table defaults
INSERT INTO product_categories (name, organization_id)
SELECT DISTINCT 
  p.category as name,
  p.organization_id
FROM products p
WHERE p.category IS NOT NULL
  AND p.category != ''
  AND NOT EXISTS (
    SELECT 1 FROM product_categories pc 
    WHERE pc.name = p.category AND pc.organization_id = p.organization_id
  )
ON CONFLICT (name, organization_id) DO NOTHING;

-- Step 3: Ensure category_id column exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id);

-- Step 4: Populate category_id based on existing category names
-- Links products to their corresponding category in the new table
UPDATE products p
SET category_id = pc.id
FROM product_categories pc
WHERE p.category = pc.name 
  AND p.organization_id = pc.organization_id
  AND p.category_id IS NULL;
