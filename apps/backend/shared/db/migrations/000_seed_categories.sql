-- =============================================================================
-- 000_seed_categories.sql
-- Default expense categories — run after migrations
-- =============================================================================

INSERT INTO categories (name, color, icon, is_default) VALUES
  ('Food & Dining',    '#F97316', 'utensils',      TRUE),
  ('Transport',        '#3B82F6', 'car',            TRUE),
  ('Housing',          '#8B5CF6', 'home',           TRUE),
  ('Health',           '#EF4444', 'heart-pulse',    TRUE),
  ('Entertainment',    '#EC4899', 'tv',             TRUE),
  ('Shopping',         '#F59E0B', 'shopping-bag',   TRUE),
  ('Education',        '#10B981', 'book-open',      TRUE),
  ('Utilities',        '#6B7280', 'zap',            TRUE),
  ('Travel',           '#14B8A6', 'plane',          TRUE),
  ('Other',            '#9CA3AF', 'tag',            TRUE)
ON CONFLICT DO NOTHING;
