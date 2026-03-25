-- =============================================================================
-- 006_create_incomes.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS incomes (
  id          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description VARCHAR(500),
  source      VARCHAR(255),
  date        DATE           NOT NULL,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incomes_user_id   ON incomes (user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_user_month ON incomes (user_id, EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date));

DROP TRIGGER IF EXISTS incomes_updated_at ON incomes;
CREATE TRIGGER incomes_updated_at
  BEFORE UPDATE ON incomes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
