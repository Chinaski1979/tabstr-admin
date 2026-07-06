CREATE TABLE IF NOT EXISTS providers (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          bank_account_number VARCHAR(50),
          bank VARCHAR(100),
          email VARCHAR(255),
          notes TEXT,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

-- Enable Row Level Security
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "provider_policy" ON providers;
CREATE POLICY "provider_policy" ON providers
  FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);