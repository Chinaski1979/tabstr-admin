CREATE TABLE IF NOT EXISTS products (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          cost DECIMAL(10,2),
          price DECIMAL(10,2) NOT NULL,
          stock INTEGER DEFAULT 0,
          minimum_stock_level INTEGER,
          notes TEXT,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          provider_id UUID REFERENCES providers(id),
          provider_code VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          avoid_tracking BOOLEAN DEFAULT FALSE
        );
        
--Deprecated, now use product_categories        
--ALTER TABLE products ADD COLUMN IF NOT EXISTS cabys_code VARCHAR(50);
--ALTER TABLE products ADD COLUMN IF NOT EXISTS cabys_tax DECIMAL(5,2);

--For deleting the columns
ALTER TABLE products DROP COLUMN IF EXISTS cabys_code;
ALTER TABLE products DROP COLUMN IF EXISTS cabys_tax;

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_weekdays SMALLINT[] DEFAULT NULL;

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_products_is_pinned ON products(is_pinned);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "product_policy" ON products;
CREATE POLICY "product_policy" ON products
  FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);
