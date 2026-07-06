-- Local mirror of provider orders (invoices received by email in the Hacienda
-- microservice) that this organization has pulled for inventory import. Tabstr
-- owns this copy independently of Factora: rows are deleted once the user
-- imports or dismisses the order, so the table only ever holds pending work.
-- `id` is the microservice's retrieved-invoice id, which makes the pull/ack sync
-- idempotent (re-syncing the same order is a no-op).
CREATE TABLE IF NOT EXISTS provider_orders (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_clave VARCHAR(255) NOT NULL,
    provider_name VARCHAR(255),
    provider_tax_id VARCHAR(64),
    total NUMERIC,
    xml TEXT NOT NULL,
    retrieved_at TIMESTAMP WITH TIME ZONE,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS provider_orders_organization_idx
    ON provider_orders (organization_id);

-- Enable Row Level Security
ALTER TABLE provider_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: matches accepted_orders_history (org isolation enforced by the
-- per-organization database; permissive within the org's own DB).
DROP POLICY IF EXISTS "provider_orders_policy" ON provider_orders;
CREATE POLICY "provider_orders_policy" ON provider_orders
  FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);
