-- ============================================================
-- 010: budget viewer — staf tertentu dapat akses panel anggaran
--      penuh seperti Kadiv (lihat semua pengeluaran + sisa pagu)
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_budget_viewer boolean NOT NULL DEFAULT false;

-- Aktifkan untuk Hendra B Hamzah
UPDATE profiles SET is_budget_viewer = true WHERE full_name ILIKE '%hendra%hamzah%';

CREATE OR REPLACE FUNCTION get_my_budget_viewer()
RETURNS boolean AS $$
  SELECT COALESCE((SELECT is_budget_viewer FROM profiles WHERE id = auth.uid()), false);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Budget viewer boleh LIHAT semua pengeluaran (input/edit tetap aturan lama)
DROP POLICY IF EXISTS "expenses_select_budget_viewer" ON expenses;
CREATE POLICY "expenses_select_budget_viewer" ON expenses
  FOR SELECT USING (get_my_budget_viewer());

-- Verifikasi: harus menampilkan Hendra
SELECT full_name, role, is_budget_viewer FROM profiles WHERE is_budget_viewer = true;
