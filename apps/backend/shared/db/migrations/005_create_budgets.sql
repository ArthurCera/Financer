-- =============================================================================
-- 005_create_budgets.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS budgets (
  id          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID           REFERENCES categories(id) ON DELETE CASCADE,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  month       SMALLINT       NOT NULL CHECK (month BETWEEN 1 AND 12),
  year        SMALLINT       NOT NULL CHECK (year >= 2000),
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  -- A user can have one budget per category per month (NULL category = total budget)
  CONSTRAINT uq_budget_user_category_period UNIQUE (user_id, category_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON budgets (user_id, year, month);
