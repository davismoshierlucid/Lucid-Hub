CREATE TABLE news_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  headline TEXT NOT NULL,
  summary TEXT,
  source_url TEXT,
  published_at TIMESTAMPTZ,
  origination_relevance_note TEXT,
  claude_flagged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_items_company_id ON news_items (company_id);
CREATE INDEX idx_news_items_published_at ON news_items (published_at DESC NULLS LAST);
CREATE INDEX idx_news_items_claude_flagged ON news_items (claude_flagged) WHERE claude_flagged = true;
