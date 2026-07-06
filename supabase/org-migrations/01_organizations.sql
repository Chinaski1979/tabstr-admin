CREATE TABLE IF NOT EXISTS organizations (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(100) UNIQUE NOT NULL,
          address TEXT,
          phone VARCHAR(20),
          email VARCHAR(255),
          tax_rate DECIMAL(5,2) DEFAULT 0,
          currency VARCHAR(3) DEFAULT 'USD',
          timezone VARCHAR(50) DEFAULT 'UTC',
          -- Settings holds the boolean that indicates it the organization has service charge or IVA enabled. By default it shows an empty object.
          settings JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          slogan VARCHAR(255) DEFAULT '',
          exchange_rate DECIMAL(10,2) DEFAULT 0,
          service_charge_rate DECIMAL(5,2) DEFAULT 10.00
        );

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS digital_invoices_enabled BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS mh_api_key VARCHAR(255) DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS iva_rate DECIMAL(5,2) DEFAULT 13.00;
-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "org_policy" ON organizations;
CREATE POLICY "org_policy" ON organizations
  FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);
