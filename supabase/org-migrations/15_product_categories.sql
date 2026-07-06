
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

ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS cabys_code VARCHAR(50);
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS cabys_tax DECIMAL(5,2);
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS activity_code VARCHAR(50);
-- Enable Row Level Security
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "product_categories_policy" ON product_categories;
CREATE POLICY "product_categories_policy" ON product_categories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_organization_id ON product_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_show_in_sales ON product_categories(show_in_sales);
