CREATE TABLE IF NOT EXISTS organization_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_urgent BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE organization_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "organization_message_policy" ON organization_messages;
CREATE POLICY "organization_message_policy" ON organization_messages
  FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);