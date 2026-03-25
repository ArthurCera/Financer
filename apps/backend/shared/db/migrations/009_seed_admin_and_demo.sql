-- =============================================================================
-- 009_seed_admin_and_demo.sql
-- Seeds admin user (root/root), demo user, and two additional demo users
-- with comprehensive sample data across multiple months.
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

-- Sarah Chen: user2@financer.local / demo
INSERT INTO users (id, email, password_hash, name, role)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'user2@financer.local',
  '$2a$10$JnDdGE.J0YVwRdiXguwVbeaajSd4HOLZONfst7ZbJba8CIDoOYCuK',
  'Sarah Chen',
  'user'
) ON CONFLICT (email) DO NOTHING;

-- Mike Johnson: user3@financer.local / demo
INSERT INTO users (id, email, password_hash, name, role)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'user3@financer.local',
  '$2a$10$JnDdGE.J0YVwRdiXguwVbeaajSd4HOLZONfst7ZbJba8CIDoOYCuK',
  'Mike Johnson',
  'user'
) ON CONFLICT (email) DO NOTHING;

-- ===========================================================================
-- Demo user expenses — CURRENT MONTH
-- ===========================================================================
INSERT INTO expenses (user_id, category_id, amount, description, date) VALUES
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Housing' LIMIT 1), 1200.00, 'Monthly rent', date_trunc('month', CURRENT_DATE) + INTERVAL '0 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 42.50, 'Grocery store', date_trunc('month', CURRENT_DATE) + INTERVAL '1 day'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 18.75, 'Coffee shop', date_trunc('month', CURRENT_DATE) + INTERVAL '3 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 67.30, 'Restaurant dinner', date_trunc('month', CURRENT_DATE) + INTERVAL '5 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 31.20, 'Lunch takeout', date_trunc('month', CURRENT_DATE) + INTERVAL '8 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 55.00, 'Gas station', date_trunc('month', CURRENT_DATE) + INTERVAL '2 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 12.50, 'Bus pass', date_trunc('month', CURRENT_DATE) + INTERVAL '5 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Utilities' LIMIT 1), 85.00, 'Electric bill', date_trunc('month', CURRENT_DATE) + INTERVAL '4 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Utilities' LIMIT 1), 45.00, 'Internet bill', date_trunc('month', CURRENT_DATE) + INTERVAL '4 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Utilities' LIMIT 1), 62.00, 'Water bill', date_trunc('month', CURRENT_DATE) + INTERVAL '6 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 15.99, 'Streaming subscription', date_trunc('month', CURRENT_DATE) + INTERVAL '1 day'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 45.00, 'Concert tickets', date_trunc('month', CURRENT_DATE) + INTERVAL '9 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Shopping' LIMIT 1), 65.00, 'New headphones', date_trunc('month', CURRENT_DATE) + INTERVAL '6 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Shopping' LIMIT 1), 129.99, 'Running shoes', date_trunc('month', CURRENT_DATE) + INTERVAL '10 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Health' LIMIT 1), 30.00, 'Pharmacy', date_trunc('month', CURRENT_DATE) + INTERVAL '7 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Health' LIMIT 1), 150.00, 'Dentist visit', date_trunc('month', CURRENT_DATE) + INTERVAL '11 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Education' LIMIT 1), 29.99, 'Online course', date_trunc('month', CURRENT_DATE) + INTERVAL '2 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Insurance' LIMIT 1), 175.00, 'Car insurance', date_trunc('month', CURRENT_DATE) + INTERVAL '1 day'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Other' LIMIT 1), 10.00, 'Charity donation', date_trunc('month', CURRENT_DATE) + INTERVAL '8 days'),
  ('b0000000-0000-0000-0000-000000000001', NULL, 22.50, 'Misc purchase', date_trunc('month', CURRENT_DATE) + INTERVAL '3 days'),
  ('b0000000-0000-0000-0000-000000000001', NULL, 15.00, 'Cash withdrawal', date_trunc('month', CURRENT_DATE) + INTERVAL '7 days')
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- Demo user expenses — LAST MONTH
-- ===========================================================================
INSERT INTO expenses (user_id, category_id, amount, description, date) VALUES
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Housing' LIMIT 1), 1200.00, 'Monthly rent', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 55.80, 'Weekly groceries', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '2 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 38.90, 'Pizza delivery', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '7 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 12.40, 'Coffee and pastry', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '14 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 48.00, 'Gas station', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '5 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 25.00, 'Uber ride', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '18 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Utilities' LIMIT 1), 78.00, 'Electric bill', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '4 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Utilities' LIMIT 1), 45.00, 'Internet bill', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '4 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 15.99, 'Streaming subscription', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '1 day'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Shopping' LIMIT 1), 89.99, 'Winter jacket', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '12 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Health' LIMIT 1), 45.00, 'Gym membership', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '1 day'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Insurance' LIMIT 1), 175.00, 'Car insurance', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- Demo user expenses — 2 MONTHS AGO
-- ===========================================================================
INSERT INTO expenses (user_id, category_id, amount, description, date) VALUES
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Housing' LIMIT 1), 1200.00, 'Monthly rent', date_trunc('month', CURRENT_DATE) - INTERVAL '2 months'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 62.10, 'Grocery run', date_trunc('month', CURRENT_DATE) - INTERVAL '2 months' + INTERVAL '3 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 44.50, 'Brunch with friends', date_trunc('month', CURRENT_DATE) - INTERVAL '2 months' + INTERVAL '10 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 52.00, 'Gas station', date_trunc('month', CURRENT_DATE) - INTERVAL '2 months' + INTERVAL '6 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Utilities' LIMIT 1), 92.00, 'Electric bill', date_trunc('month', CURRENT_DATE) - INTERVAL '2 months' + INTERVAL '4 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Utilities' LIMIT 1), 45.00, 'Internet bill', date_trunc('month', CURRENT_DATE) - INTERVAL '2 months' + INTERVAL '4 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 15.99, 'Streaming subscription', date_trunc('month', CURRENT_DATE) - INTERVAL '2 months' + INTERVAL '1 day'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 30.00, 'Movie night', date_trunc('month', CURRENT_DATE) - INTERVAL '2 months' + INTERVAL '15 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Shopping' LIMIT 1), 42.00, 'Book order', date_trunc('month', CURRENT_DATE) - INTERVAL '2 months' + INTERVAL '8 days'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Health' LIMIT 1), 45.00, 'Gym membership', date_trunc('month', CURRENT_DATE) - INTERVAL '2 months' + INTERVAL '1 day'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Insurance' LIMIT 1), 175.00, 'Car insurance', date_trunc('month', CURRENT_DATE) - INTERVAL '2 months' + INTERVAL '1 day'),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Education' LIMIT 1), 49.99, 'Udemy bundle', date_trunc('month', CURRENT_DATE) - INTERVAL '2 months' + INTERVAL '20 days')
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- Sarah Chen expenses — CURRENT MONTH & LAST MONTH
-- ===========================================================================
INSERT INTO expenses (user_id, category_id, amount, description, date) VALUES
  -- Current month
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Housing' LIMIT 1), 1500.00, 'Apartment rent', date_trunc('month', CURRENT_DATE)),
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 85.20, 'Whole Foods groceries', date_trunc('month', CURRENT_DATE) + INTERVAL '2 days'),
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 23.50, 'Sushi lunch', date_trunc('month', CURRENT_DATE) + INTERVAL '5 days'),
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 14.80, 'Boba tea', date_trunc('month', CURRENT_DATE) + INTERVAL '7 days'),
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 120.00, 'Monthly metro pass', date_trunc('month', CURRENT_DATE) + INTERVAL '1 day'),
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Utilities' LIMIT 1), 95.00, 'Electric and gas', date_trunc('month', CURRENT_DATE) + INTERVAL '3 days'),
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 12.99, 'Spotify premium', date_trunc('month', CURRENT_DATE) + INTERVAL '1 day'),
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 55.00, 'Theater tickets', date_trunc('month', CURRENT_DATE) + INTERVAL '8 days'),
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Shopping' LIMIT 1), 199.00, 'Yoga mat and gear', date_trunc('month', CURRENT_DATE) + INTERVAL '4 days'),
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Health' LIMIT 1), 60.00, 'Yoga class pass', date_trunc('month', CURRENT_DATE) + INTERVAL '6 days'),
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Education' LIMIT 1), 39.99, 'Coursera subscription', date_trunc('month', CURRENT_DATE) + INTERVAL '1 day'),
  -- Last month
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Housing' LIMIT 1), 1500.00, 'Apartment rent', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'),
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 72.40, 'Trader Joe''s run', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '3 days'),
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 48.00, 'Korean BBQ dinner', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '12 days'),
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 120.00, 'Monthly metro pass', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '1 day'),
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Utilities' LIMIT 1), 88.00, 'Electric and gas', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '3 days'),
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Shopping' LIMIT 1), 75.00, 'Clothing sale', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '15 days'),
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Health' LIMIT 1), 60.00, 'Yoga class pass', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '1 day'),
  ('c0000000-0000-0000-0000-000000000001', NULL, 35.00, 'Gift for friend', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '20 days')
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- Mike Johnson expenses — CURRENT MONTH & LAST MONTH
-- ===========================================================================
INSERT INTO expenses (user_id, category_id, amount, description, date) VALUES
  -- Current month
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Housing' LIMIT 1), 950.00, 'Shared apartment rent', date_trunc('month', CURRENT_DATE)),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 35.60, 'Costco groceries', date_trunc('month', CURRENT_DATE) + INTERVAL '2 days'),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 28.90, 'Burrito spot', date_trunc('month', CURRENT_DATE) + INTERVAL '4 days'),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 52.30, 'Steak dinner', date_trunc('month', CURRENT_DATE) + INTERVAL '9 days'),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 65.00, 'Gas fill-up', date_trunc('month', CURRENT_DATE) + INTERVAL '3 days'),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 18.00, 'Parking garage', date_trunc('month', CURRENT_DATE) + INTERVAL '7 days'),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Utilities' LIMIT 1), 55.00, 'Electric bill share', date_trunc('month', CURRENT_DATE) + INTERVAL '5 days'),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 69.99, 'Video game', date_trunc('month', CURRENT_DATE) + INTERVAL '6 days'),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 15.99, 'Netflix', date_trunc('month', CURRENT_DATE) + INTERVAL '1 day'),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Shopping' LIMIT 1), 45.00, 'Amazon order', date_trunc('month', CURRENT_DATE) + INTERVAL '8 days'),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Health' LIMIT 1), 35.00, 'Gym membership', date_trunc('month', CURRENT_DATE) + INTERVAL '1 day'),
  -- Last month
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Housing' LIMIT 1), 950.00, 'Shared apartment rent', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 41.20, 'Grocery store', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '4 days'),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 33.50, 'Thai takeout', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '11 days'),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 58.00, 'Gas fill-up', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '6 days'),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Utilities' LIMIT 1), 55.00, 'Electric bill share', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '5 days'),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 15.99, 'Netflix', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '1 day'),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Shopping' LIMIT 1), 89.99, 'Bluetooth speaker', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '14 days'),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Health' LIMIT 1), 35.00, 'Gym membership', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '1 day'),
  ('d0000000-0000-0000-0000-000000000001', NULL, 20.00, 'Vending machines', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '9 days')
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- Demo user budgets — CURRENT MONTH, LAST MONTH, 2 MONTHS AGO
-- ===========================================================================
INSERT INTO budgets (user_id, category_id, amount, month, year) VALUES
  -- Current month
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 300.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 150.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Housing' LIMIT 1), 1300.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Utilities' LIMIT 1), 200.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 100.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Shopping' LIMIT 1), 200.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Health' LIMIT 1), 200.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Insurance' LIMIT 1), 200.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  -- Last month
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 280.00, EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::INT, EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 150.00, EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::INT, EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Housing' LIMIT 1), 1300.00, EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::INT, EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Utilities' LIMIT 1), 200.00, EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::INT, EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 80.00, EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::INT, EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Shopping' LIMIT 1), 150.00, EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::INT, EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::INT),
  -- 2 months ago
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 280.00, EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '2 months')::INT, EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '2 months')::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 120.00, EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '2 months')::INT, EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '2 months')::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Housing' LIMIT 1), 1300.00, EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '2 months')::INT, EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '2 months')::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Utilities' LIMIT 1), 200.00, EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '2 months')::INT, EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '2 months')::INT),
  ('b0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 80.00, EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '2 months')::INT, EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '2 months')::INT)
ON CONFLICT DO NOTHING;

-- Sarah budgets — current month
INSERT INTO budgets (user_id, category_id, amount, month, year) VALUES
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 350.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 150.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Housing' LIMIT 1), 1600.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('c0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 120.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT)
ON CONFLICT DO NOTHING;

-- Mike budgets — current month
INSERT INTO budgets (user_id, category_id, amount, month, year) VALUES
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 250.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Transport' LIMIT 1), 100.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Housing' LIMIT 1), 1000.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
  ('d0000000-0000-0000-0000-000000000001', (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 100.00, EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT)
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- Demo user income — CURRENT MONTH, LAST MONTH, 2 MONTHS AGO
-- ===========================================================================
INSERT INTO incomes (user_id, amount, description, source, date) VALUES
  -- Current month
  ('b0000000-0000-0000-0000-000000000001', 4500.00, 'Monthly salary', 'Employer', date_trunc('month', CURRENT_DATE)),
  ('b0000000-0000-0000-0000-000000000001', 250.00, 'Freelance project', 'Freelance', date_trunc('month', CURRENT_DATE) + INTERVAL '10 days'),
  ('b0000000-0000-0000-0000-000000000001', 50.00, 'Dividend payment', 'Investments', date_trunc('month', CURRENT_DATE) + INTERVAL '15 days'),
  -- Last month
  ('b0000000-0000-0000-0000-000000000001', 4500.00, 'Monthly salary', 'Employer', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'),
  ('b0000000-0000-0000-0000-000000000001', 180.00, 'Side gig payment', 'Freelance', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '12 days'),
  ('b0000000-0000-0000-0000-000000000001', 50.00, 'Dividend payment', 'Investments', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' + INTERVAL '15 days'),
  -- 2 months ago
  ('b0000000-0000-0000-0000-000000000001', 4500.00, 'Monthly salary', 'Employer', date_trunc('month', CURRENT_DATE) - INTERVAL '2 months'),
  ('b0000000-0000-0000-0000-000000000001', 50.00, 'Dividend payment', 'Investments', date_trunc('month', CURRENT_DATE) - INTERVAL '2 months' + INTERVAL '15 days'),
  -- Sarah income
  ('c0000000-0000-0000-0000-000000000001', 5200.00, 'Software engineer salary', 'TechCorp', date_trunc('month', CURRENT_DATE)),
  ('c0000000-0000-0000-0000-000000000001', 5200.00, 'Software engineer salary', 'TechCorp', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'),
  ('c0000000-0000-0000-0000-000000000001', 300.00, 'Open source bounty', 'GitHub Sponsors', date_trunc('month', CURRENT_DATE) + INTERVAL '8 days'),
  -- Mike income
  ('d0000000-0000-0000-0000-000000000001', 3800.00, 'Marketing coordinator salary', 'AdAgency', date_trunc('month', CURRENT_DATE)),
  ('d0000000-0000-0000-0000-000000000001', 3800.00, 'Marketing coordinator salary', 'AdAgency', date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'),
  ('d0000000-0000-0000-0000-000000000001', 150.00, 'Blog sponsorship', 'Sponsor', date_trunc('month', CURRENT_DATE) + INTERVAL '5 days')
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- Demo LLM chat messages
-- ===========================================================================
INSERT INTO llm_chats (user_id, role, content, created_at) VALUES
  -- Demo User conversations
  ('b0000000-0000-0000-0000-000000000001', 'user', 'What are my biggest expenses this month?', NOW() - INTERVAL '6 days'),
  ('b0000000-0000-0000-0000-000000000001', 'assistant', 'Based on your spending data, your largest expense this month is Housing at $1,200, followed by Insurance at $175 and Health expenses at $180. Your food spending totals around $159.75 across multiple purchases.', NOW() - INTERVAL '6 days' + INTERVAL '5 seconds'),
  ('b0000000-0000-0000-0000-000000000001', 'user', 'How can I save more on food?', NOW() - INTERVAL '5 days'),
  ('b0000000-0000-0000-0000-000000000001', 'assistant', 'Here are some tips to reduce your food spending: 1. Meal planning and batch cooking on weekends. 2. Use grocery store loyalty programs. 3. Limit dining out to once per week. 4. Bring lunch to work instead of buying. 5. Buy seasonal produce which tends to be cheaper.', NOW() - INTERVAL '5 days' + INTERVAL '5 seconds'),
  ('b0000000-0000-0000-0000-000000000001', 'user', 'Compare my spending this month vs last month', NOW() - INTERVAL '4 days'),
  ('b0000000-0000-0000-0000-000000000001', 'assistant', 'Comparing your monthly spending: Last month you spent approximately $1,829.08 total. This month so far you have spent approximately $2,307.72. The main increases are in Shopping (+$105) and Health (+$135). Your Food & Dining spending is fairly consistent.', NOW() - INTERVAL '4 days' + INTERVAL '5 seconds'),
  ('b0000000-0000-0000-0000-000000000001', 'user', 'Am I on track with my budgets?', NOW() - INTERVAL '3 days'),
  ('b0000000-0000-0000-0000-000000000001', 'assistant', 'Looking at your budget progress: Housing is at 92% ($1,200/$1,300) - on track. Food & Dining is at 53% ($159.75/$300) - well within budget. Entertainment is at 61% ($60.99/$100) - manageable. Shopping is at 97% ($194.99/$200) - nearly maxed out. I recommend being cautious with additional shopping purchases this month.', NOW() - INTERVAL '3 days' + INTERVAL '5 seconds'),
  ('b0000000-0000-0000-0000-000000000001', 'user', 'What category should I focus on reducing?', NOW() - INTERVAL '2 days'),
  ('b0000000-0000-0000-0000-000000000001', 'assistant', 'Based on your spending patterns, I recommend focusing on Shopping. You are at 97% of your budget and it has been trending upward. Consider: 1. Implementing a 24-hour wait rule before purchases. 2. Unsubscribing from promotional emails. 3. Creating a wishlist and revisiting items after a week.', NOW() - INTERVAL '2 days' + INTERVAL '5 seconds'),
  ('b0000000-0000-0000-0000-000000000001', 'user', 'Can you categorize my uncategorized expenses?', NOW() - INTERVAL '1 day'),
  ('b0000000-0000-0000-0000-000000000001', 'assistant', 'I found 2 uncategorized expenses: 1. "Misc purchase" ($22.50) - This looks like it could be Shopping. 2. "Cash withdrawal" ($15.00) - Without more context, I would suggest categorizing this as Other. Would you like me to apply these categories?', NOW() - INTERVAL '1 day' + INTERVAL '5 seconds'),
  ('b0000000-0000-0000-0000-000000000001', 'user', 'Show me a summary of my financial health', NOW() - INTERVAL '12 hours'),
  ('b0000000-0000-0000-0000-000000000001', 'assistant', 'Here is your financial health summary: Income this month: $4,800. Expenses so far: $2,307.72. Savings potential: $2,492.28 (52% savings rate). You are doing well overall. Your emergency fund equivalent based on current spending would be approximately 2.1 months. Most budgets are on track except Shopping which needs attention.', NOW() - INTERVAL '12 hours' + INTERVAL '5 seconds'),
  -- Sarah conversations
  ('c0000000-0000-0000-0000-000000000001', 'user', 'How much did I spend on food this month?', NOW() - INTERVAL '3 days'),
  ('c0000000-0000-0000-0000-000000000001', 'assistant', 'This month you have spent $123.50 on Food & Dining across 3 transactions: Whole Foods groceries ($85.20), Sushi lunch ($23.50), and Boba tea ($14.80). You are at 35% of your $350 food budget.', NOW() - INTERVAL '3 days' + INTERVAL '5 seconds'),
  ('c0000000-0000-0000-0000-000000000001', 'user', 'What is my largest expense category?', NOW() - INTERVAL '2 days'),
  ('c0000000-0000-0000-0000-000000000001', 'assistant', 'Your largest expense category this month is Housing at $1,500 (apartment rent), which represents about 62% of your total spending. This is followed by Shopping at $199.00 (yoga mat and gear) and Transport at $120.00 (metro pass).', NOW() - INTERVAL '2 days' + INTERVAL '5 seconds'),
  ('c0000000-0000-0000-0000-000000000001', 'user', 'Give me tips to increase my savings rate', NOW() - INTERVAL '1 day'),
  ('c0000000-0000-0000-0000-000000000001', 'assistant', 'With your income of $5,200 and current spending of ~$2,405, you have a solid 54% savings rate. To increase it further: 1. Consider cooking more at home to reduce dining costs. 2. Look for free entertainment alternatives. 3. Set up automatic transfers to a high-yield savings account. 4. Review subscriptions quarterly. 5. Consider negotiating your rent at lease renewal.', NOW() - INTERVAL '1 day' + INTERVAL '5 seconds'),
  -- Mike conversations
  ('d0000000-0000-0000-0000-000000000001', 'user', 'Am I spending too much on entertainment?', NOW() - INTERVAL '2 days'),
  ('d0000000-0000-0000-0000-000000000001', 'assistant', 'Your entertainment spending this month is $85.98 (Netflix $15.99 + Video game $69.99), which is 86% of your $100 budget. While you are within budget, you are close to the limit with the month not yet over. I suggest holding off on additional entertainment purchases to stay on track.', NOW() - INTERVAL '2 days' + INTERVAL '5 seconds')
ON CONFLICT DO NOTHING;
