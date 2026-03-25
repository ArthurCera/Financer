-- =============================================================================
-- 009_seed_admin_and_demo.sql
-- Seeds admin user (root/root) and demo user with sample data.
-- Idempotent — uses ON CONFLICT DO NOTHING.
-- =============================================================================

-- Admin user: root@financer.local / root
INSERT INTO users (id, email, password_hash, name, role)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'root@financer.local',
  '$2a$10$iU6gyJH6jAezP0iRoO0bFefC5Xa3dci3Y5gZLfAt6t0RLT97lmNeO',
  'Admin',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Demo user: demo@financer.local / demo
INSERT INTO users (id, email, password_hash, name, role)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'demo@financer.local',
  '$2a$10$JnDdGE.J0YVwRdiXguwVbeaajSd4HOLZONfst7ZbJba8CIDoOYCuK',
  'Demo User',
  'user'
) ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Demo expenses (current month — uses date_trunc for portability)
-- ---------------------------------------------------------------------------
INSERT INTO expenses (user_id, category_id, amount, description, date) VALUES
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 42.50, 'Grocery store', date_trunc('month', CURRENT_DATE) + INTERVAL '1 day'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 18.75, 'Coffee shop', date_trunc('month', CURRENT_DATE) + INTERVAL '3 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 55.00, 'Gas station', date_trunc('month', CURRENT_DATE) + INTERVAL '2 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 12.50, 'Bus pass', date_trunc('month', CURRENT_DATE) + INTERVAL '5 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Housing' LIMIT 1), 1200.00, 'Monthly rent', date_trunc('month', CURRENT_DATE) + INTERVAL '0 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Utilities' LIMIT 1), 85.00, 'Electric bill', date_trunc('month', CURRENT_DATE) + INTERVAL '4 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Utilities' LIMIT 1), 45.00, 'Internet bill', date_trunc('month', CURRENT_DATE) + INTERVAL '4 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 15.99, 'Streaming subscription', date_trunc('month', CURRENT_DATE) + INTERVAL '1 day'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Shopping' LIMIT 1), 65.00, 'New headphones', date_trunc('month', CURRENT_DATE) + INTERVAL '6 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Health' LIMIT 1), 30.00, 'Pharmacy', date_trunc('month', CURRENT_DATE) + INTERVAL '7 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Education' LIMIT 1), 29.99, 'Online course', date_trunc('month', CURRENT_DATE) + INTERVAL '2 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Other' LIMIT 1), 10.00, 'Charity donation', date_trunc('month', CURRENT_DATE) + INTERVAL '8 days')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Demo budgets (current month)
-- ---------------------------------------------------------------------------
INSERT INTO budgets (user_id, category_id, amount, month, year) VALUES
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 300.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 150.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Housing' LIMIT 1), 1300.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Utilities' LIMIT 1), 200.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 100.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Shopping' LIMIT 1), 200.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Demo income (current month)
-- ---------------------------------------------------------------------------
INSERT INTO incomes (user_id, amount, description, source, date) VALUES
  ('b0000000-0000-0000-0000-000000000001', 4500.00, 'Monthly salary', 'Employer', date_trunc('month', CURRENT_DATE) + INTERVAL '0 days'),
  ('b0000000-0000-0000-0000-000000000001', 250.00, 'Freelance project', 'Freelance', date_trunc('month', CURRENT_DATE) + INTERVAL '10 days'),
  ('b0000000-0000-0000-0000-000000000001', 50.00, 'Dividend payment', 'Investments', date_trunc('month', CURRENT_DATE) + INTERVAL '15 days')
ON CONFLICT DO NOTHING;
