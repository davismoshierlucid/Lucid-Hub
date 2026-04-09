ALTER TABLE companies
ADD COLUMN IF NOT EXISTS outreach_attempt_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS last_outreach_date TIMESTAMPTZ;

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS snooze_until_date TIMESTAMPTZ;

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS cadence_status VARCHAR(50) NOT NULL DEFAULT 'active';

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS cadence_note TEXT;

CREATE INDEX IF NOT EXISTS idx_companies_cadence_status ON companies (cadence_status);
CREATE INDEX IF NOT EXISTS idx_companies_snooze_until ON companies (snooze_until_date);
