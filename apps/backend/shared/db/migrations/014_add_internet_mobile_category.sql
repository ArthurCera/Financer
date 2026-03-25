-- =============================================================================
-- 014_add_internet_mobile_category.sql
-- Add "Internet & Mobile" default category
-- =============================================================================

INSERT INTO categories (name, color, icon, is_default) VALUES
  ('Internet & Mobile', '#0EA5E9', 'wifi', TRUE)
ON CONFLICT DO NOTHING;
