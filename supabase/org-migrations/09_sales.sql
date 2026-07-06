CREATE TABLE IF NOT EXISTS sales (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          tab_id UUID REFERENCES tabs(id),
          customer_name VARCHAR(255) NOT NULL,
          subtotal DECIMAL(10,2) NOT NULL,
          discount DECIMAL(5,2) DEFAULT 0,
          total DECIMAL(10,2) NOT NULL,
          payment_method_id UUID REFERENCES payment_methods(id),
          payment_methods JSONB DEFAULT '[]'::jsonb,
          sold_by UUID REFERENCES auth.users(id),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          service_charge DECIMAL(10,2) DEFAULT 0,
          service_charge_rate DECIMAL(5,2) DEFAULT 0
        );

ALTER TABLE sales ADD COLUMN IF NOT EXISTS sinpe_photo_url TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_id VARCHAR(255);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS iva DECIMAL(10,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS iva_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS card_last_four_digits VARCHAR(10);
-- Tip
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tip numeric(12,2);
UPDATE sales SET tip = 0 WHERE tip IS NULL;
ALTER TABLE sales ALTER COLUMN tip SET DEFAULT 0;
ALTER TABLE sales ALTER COLUMN tip SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_tip_non_negative'
      AND conrelid = 'sales'::regclass
  ) THEN
    ALTER TABLE sales
      ADD CONSTRAINT sales_tip_non_negative CHECK (tip >= 0);
  END IF;
END $$;
-- End of Tip

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_tab_sale' 
        AND conrelid = 'sales'::regclass
    ) THEN
        ALTER TABLE sales ADD CONSTRAINT unique_tab_sale UNIQUE (tab_id);
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "sale_policy" ON sales;
CREATE POLICY "sale_policy" ON sales
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);