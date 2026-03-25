-- =============================================================================
-- 011_add_budget_updated_at.sql — Add missing updated_at column to budgets
-- =============================================================================

ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
