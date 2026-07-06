CREATE TABLE IF NOT EXISTS tab_items (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          tab_id UUID REFERENCES tabs(id) ON DELETE CASCADE,
          product_id UUID REFERENCES products(id),
          product_name VARCHAR(255) NOT NULL,
          product_category VARCHAR(100) NOT NULL,
          quantity INTEGER DEFAULT 1,
          unit_price DECIMAL(10,2) NOT NULL,
          discount DECIMAL(5,2) DEFAULT 0,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

-- Add notes column if it doesn't exist (for existing databases, delete when its included in all existing databases)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tab_items' AND column_name = 'notes'
  ) THEN
    ALTER TABLE tab_items ADD COLUMN notes TEXT;
  END IF;
END $$;

ALTER TABLE tab_items ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tab_items_organization_id ON tab_items (organization_id);
ALTER TABLE tab_items REPLICA IDENTITY FULL;
-- Enable Row Level Security
ALTER TABLE tab_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "tab_item_policy" ON tab_items;
CREATE POLICY "tab_item_policy" ON tab_items
  FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);