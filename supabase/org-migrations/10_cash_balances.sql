CREATE TABLE IF NOT EXISTS cash_balances (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          date DATE NOT NULL,
          expected_cash DECIMAL(10,2) DEFAULT 0,
          actual_cash DECIMAL(10,2) DEFAULT 0,
          cash_difference DECIMAL(10,2) GENERATED ALWAYS AS (actual_cash - expected_cash) STORED,
          expected_card DECIMAL(10,2) DEFAULT 0,
          actual_card DECIMAL(10,2) DEFAULT 0,
          card_difference DECIMAL(10,2) GENERATED ALWAYS AS (actual_card - expected_card) STORED,
          notes TEXT,
          balanced_by UUID REFERENCES auth.users(id),
          balanced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
        );

-- Enable Row Level Security
ALTER TABLE cash_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "cash_balance_policy" ON cash_balances;
CREATE POLICY "cash_balance_policy" ON cash_balances
  FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);