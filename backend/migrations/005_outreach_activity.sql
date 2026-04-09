CREATE TYPE outreach_activity_type AS ENUM (
  'email_outbound',
  'email_inbound',
  'call',
  'meeting',
  'note'
);

CREATE TABLE outreach_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts (id) ON DELETE SET NULL,
  banker_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  activity_type outreach_activity_type NOT NULL,
  subject TEXT,
  body TEXT,
  activity_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  replied BOOLEAN NOT NULL DEFAULT false,
  reply_body TEXT,
  thread_id TEXT,
  commitment_detected BOOLEAN NOT NULL DEFAULT false,
  commitment_text TEXT,
  meeting_attendees JSONB,
  meeting_duration_minutes INTEGER,
  meeting_subject TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outreach_company_id ON outreach_activity (company_id);
CREATE INDEX idx_outreach_contact_id ON outreach_activity (contact_id);
CREATE INDEX idx_outreach_banker_id ON outreach_activity (banker_id);
CREATE INDEX idx_outreach_thread_id ON outreach_activity (thread_id);
CREATE INDEX idx_outreach_activity_timestamp ON outreach_activity (activity_timestamp DESC);
CREATE INDEX idx_outreach_activity_type ON outreach_activity (activity_type);
