CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  title TEXT,
  phone TEXT,
  relationship_owner_id UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_company_id ON contacts (company_id);
CREATE INDEX idx_contacts_email_lower ON contacts (LOWER(email));
