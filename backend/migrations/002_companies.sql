CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ticker TEXT,
  exchange TEXT,
  sector TEXT,
  sub_sector TEXT,
  market_cap_band TEXT,
  coverage_status TEXT,
  origination_status TEXT,
  situation_type TEXT,
  priority_score SMALLINT CHECK (
    priority_score IS NULL OR (priority_score >= 0 AND priority_score <= 100)
  ),
  banker_flag BOOLEAN NOT NULL DEFAULT false,
  banker_flag_reason TEXT,
  banker_flag_set_by UUID REFERENCES users (id) ON DELETE SET NULL,
  banker_flag_set_at TIMESTAMPTZ,
  data_health_score SMALLINT CHECK (
    data_health_score IS NULL OR (data_health_score >= 0 AND data_health_score <= 100)
  ),
  angle_scores JSONB,
  last_interaction TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_name ON companies (name);
CREATE INDEX idx_companies_coverage_status ON companies (coverage_status);
CREATE INDEX idx_companies_origination_status ON companies (origination_status);
CREATE INDEX idx_companies_banker_flag ON companies (banker_flag) WHERE banker_flag = true;
CREATE INDEX idx_companies_last_interaction ON companies (last_interaction DESC NULLS LAST);
