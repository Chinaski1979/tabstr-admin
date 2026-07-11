CREATE TABLE IF NOT EXISTS accepted_orders_history (
    order_id VARCHAR(255) PRIMARY KEY,
    provider_name VARCHAR(255) NOT NULL,
    items JSON DEFAULT '[]'::json,
    total_items INTEGER NOT NULL,
    order_imported_by UUID REFERENCES auth.users(id),
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE accepted_orders_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "accepted_orders_history_policy" ON accepted_orders_history;
CREATE POLICY "accepted_orders_history_policy" ON accepted_orders_history
  FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);