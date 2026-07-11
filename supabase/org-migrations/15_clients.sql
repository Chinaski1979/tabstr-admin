CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tipo VARCHAR(255),
  identification VARCHAR(255), --this is the unique identifier for the client in the organization
  email VARCHAR(255),
  phone JSONB DEFAULT '{"country_code": "", "number": ""}'::jsonb,
  address JSONB DEFAULT '{"province": "", "canton": "", "district": "", "other": ""}'::jsonb,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Prevent duplicate identification per organization
CREATE UNIQUE INDEX IF NOT EXISTS clients_organization_identification_key
  ON clients (organization_id, identification)
  WHERE identification IS NOT NULL AND identification != '';


-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "client_policy" ON clients;
CREATE POLICY "client_policy" ON clients
  FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);