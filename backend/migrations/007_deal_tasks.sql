CREATE TABLE deal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals (id) ON DELETE CASCADE,
  section TEXT,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES users (id) ON DELETE SET NULL,
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_tasks_deal_id ON deal_tasks (deal_id);
CREATE INDEX idx_deal_tasks_assignee_id ON deal_tasks (assignee_id);
CREATE INDEX idx_deal_tasks_completed ON deal_tasks (completed);
CREATE INDEX idx_deal_tasks_due_date ON deal_tasks (due_date);
