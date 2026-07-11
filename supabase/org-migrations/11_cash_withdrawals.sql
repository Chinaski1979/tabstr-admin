CREATE TABLE IF NOT EXISTS cash_withdrawals (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
          justification TEXT NOT NULL,
          withdrawn_by UUID REFERENCES auth.users(id),
          withdrawn_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          date DATE NOT NULL,
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

-- Enable Row Level Security
ALTER TABLE cash_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "cash_withdrawal_policy" ON cash_withdrawals;
CREATE POLICY "cash_withdrawal_policy" ON cash_withdrawals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true); 