-- =============================================================================
-- 012_multi_tier_roles.sql
-- Extends user roles to three tiers: superadmin, admin, user.
-- Adds managed_by column for admin-to-user hierarchy.
-- =============================================================================

-- 1. Drop old two-value CHECK constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Add three-value CHECK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_role_check' AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('superadmin', 'admin', 'user'));
  END IF;
END $$;

-- 3. Add managed_by column (admin-to-user link)
ALTER TABLE users ADD COLUMN IF NOT EXISTS managed_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 4. Index for efficient sub-account lookups
CREATE INDEX IF NOT EXISTS idx_users_managed_by ON users (managed_by);

-- 5. Promote existing root admin to superadmin
UPDATE users SET role = 'superadmin' WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- 6. Change default role for new users to 'admin' (new signups are auto-admin)
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'admin';
