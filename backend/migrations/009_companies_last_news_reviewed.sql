ALTER TABLE companies
ADD COLUMN IF NOT EXISTS last_news_reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_companies_last_news_reviewed_at
ON companies (last_news_reviewed_at DESC NULLS LAST);
