CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  deal_type TEXT NOT NULL CHECK (deal_type IN ('equity', 'debt', 'advisory')),
  stage TEXT,
  deal_memory JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deals_company_id ON deals (company_id);
CREATE INDEX idx_deals_deal_type ON deals (deal_type);
CREATE INDEX idx_deals_stage ON deals (stage);
