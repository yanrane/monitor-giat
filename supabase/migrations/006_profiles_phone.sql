-- ============================================================
-- 006: nomor WA di profiles + izin Kadiv update profil user
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;

-- Kadiv perlu bisa update profil user lain (edit role/dept/nomor WA
-- di Kelola Akun). Policy lama hanya izinkan update profil sendiri.
DROP POLICY IF EXISTS "profiles_update_kadiv" ON profiles;
CREATE POLICY "profiles_update_kadiv" ON profiles
  FOR UPDATE USING (get_my_role() = 'kadiv');
