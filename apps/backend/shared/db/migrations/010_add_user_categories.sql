-- Add user_id to categories for user-specific custom categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Drop the old unique constraint on name alone
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;

-- Add composite unique: same name can exist for different users (NULL = system)
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_name_user
  ON categories (name, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'));

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories (user_id);
