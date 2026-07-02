-- ============================================================
-- 011: kunci pagu anggaran — hanya kadiv & budget viewer yang
--      bisa baca/ubah app_settings. Staf lain murni input kegiatan.
-- ============================================================

DROP POLICY IF EXISTS "settings_select_all" ON app_settings;
DROP POLICY IF EXISTS "settings_insert_all" ON app_settings;
DROP POLICY IF EXISTS "settings_update_all" ON app_settings;

CREATE POLICY "settings_select_budget" ON app_settings
  FOR SELECT USING (get_my_role() = 'kadiv' OR get_my_budget_viewer());

CREATE POLICY "settings_insert_budget" ON app_settings
  FOR INSERT WITH CHECK (get_my_role() = 'kadiv' OR get_my_budget_viewer());

CREATE POLICY "settings_update_budget" ON app_settings
  FOR UPDATE USING (get_my_role() = 'kadiv' OR get_my_budget_viewer());
