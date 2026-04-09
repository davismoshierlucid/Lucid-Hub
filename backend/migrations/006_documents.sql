CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies (id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals (id) ON DELETE CASCADE,
  s3_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  edit_history JSONB,
  uploaded_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (company_id IS NOT NULL OR deal_id IS NOT NULL)
);

CREATE INDEX idx_documents_company_id ON documents (company_id);
CREATE INDEX idx_documents_deal_id ON documents (deal_id);
CREATE INDEX idx_documents_uploaded_by ON documents (uploaded_by);
CREATE INDEX idx_documents_s3_key ON documents (s3_key);
