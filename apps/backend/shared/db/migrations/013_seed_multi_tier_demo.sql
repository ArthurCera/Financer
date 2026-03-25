-- =============================================================================
-- 013_seed_multi_tier_demo.sql
-- Seeds multi-tier demo data:
--   - A second superadmin for testing
--   - A demo admin account
--   - Links existing demo users as sub-accounts of the demo admin
-- =============================================================================

-- Superadmin test account: superadmin@financer.local / superadmin
INSERT INTO users (id, email, password_hash, name, role)
VALUES (
  'f0000000-0000-0000-0000-000000000001',
  'superadmin@financer.local',
  '$2a$10$UfZQIFdcrMykUGupowv4E.rK1Hfb0RYwVIHMPSU262x1t3s.I9Jiy',
  'Super Admin',
  'superadmin'
) ON CONFLICT (email) DO NOTHING;

-- Demo admin account: admin@financer.local / demo
INSERT INTO users (id, email, password_hash, name, role)
VALUES (
  'e0000000-0000-0000-0000-000000000001',
  'admin@financer.local',
  '$2a$10$JnDdGE.J0YVwRdiXguwVbeaajSd4HOLZONfst7ZbJba8CIDoOYCuK',
  'Demo Admin',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Link existing demo users as sub-accounts of the demo admin
UPDATE users SET managed_by = 'e0000000-0000-0000-0000-000000000001'
WHERE id = 'b0000000-0000-0000-0000-000000000001' AND managed_by IS NULL;

UPDATE users SET managed_by = 'e0000000-0000-0000-0000-000000000001'
WHERE id = 'c0000000-0000-0000-0000-000000000001' AND managed_by IS NULL;
