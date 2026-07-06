CREATE TABLE IF NOT EXISTS tabs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          customer_name VARCHAR(255) NOT NULL,
          created_by UUID REFERENCES auth.users(id),
          discount DECIMAL(5,2) DEFAULT 0,
          is_open BOOLEAN DEFAULT true,
          invoice_number VARCHAR(255) DEFAULT NULL,
          is_credit BOOLEAN DEFAULT false,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

-- Enable Row Level Security
ALTER TABLE tabs ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "tab_policy" ON tabs;
CREATE POLICY "tab_policy" ON tabs
  FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE tabs
  ADD COLUMN IF NOT EXISTS is_credit BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE tabs
  ADD COLUMN IF NOT EXISTS iva_disabled BOOLEAN DEFAULT FALSE;

ALTER TABLE tabs
  ADD COLUMN IF NOT EXISTS party_size INTEGER DEFAULT NULL;

ALTER TABLE tabs
  ADD COLUMN IF NOT EXISTS server_name VARCHAR(255) DEFAULT NULL;

ALTER TABLE tabs
  ADD COLUMN IF NOT EXISTS service_charge_disabled BOOLEAN NOT NULL DEFAULT false;
