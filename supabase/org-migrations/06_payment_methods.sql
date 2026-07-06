CREATE TABLE IF NOT EXISTS payment_methods (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          icon VARCHAR(50) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          default_payment_method_id numeric(1,0)
        );

-- Enable Row Level Security
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "payment_method_policy" ON payment_methods;
CREATE POLICY "payment_method_policy" ON payment_methods
  FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);