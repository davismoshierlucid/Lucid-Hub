ALTER TABLE companies
ADD COLUMN IF NOT EXISTS priority_score_breakdown JSONB;

CREATE INDEX IF NOT EXISTS idx_companies_priority_score ON companies (priority_score DESC NULLS LAST);
