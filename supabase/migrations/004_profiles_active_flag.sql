-- ============================================================
-- 004: Soft-deactivate transferred users instead of deleting history
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE profiles
SET is_active = false,
    dept_id = NULL
WHERE full_name = 'Ade Trisnani Wijaya';

CREATE INDEX IF NOT EXISTS idx_profiles_is_active
  ON profiles (is_active);
