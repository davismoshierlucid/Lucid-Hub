ALTER TABLE outreach_activity
  ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_outreach_deal_id ON outreach_activity (deal_id);
