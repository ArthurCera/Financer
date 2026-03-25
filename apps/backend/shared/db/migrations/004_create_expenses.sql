-- =============================================================================
-- 004_create_expenses.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS expenses (
  id          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID           REFERENCES categories(id) ON DELETE SET NULL,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description VARCHAR(500),
  date        DATE           NOT NULL,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_id   ON expenses (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date       ON expenses (date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_month ON expenses (user_id, EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date));

DROP TRIGGER IF EXISTS expenses_updated_at ON expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
