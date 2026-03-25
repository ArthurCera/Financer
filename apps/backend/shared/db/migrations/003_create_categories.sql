-- =============================================================================
-- 003_create_categories.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(100) NOT NULL UNIQUE,
  color      VARCHAR(7)  NOT NULL DEFAULT '#6B7280',  -- hex color
  icon       VARCHAR(50) NOT NULL DEFAULT 'tag',       -- icon name
  is_default BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories (name);
