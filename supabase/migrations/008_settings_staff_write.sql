-- ============================================================
-- 008: staf/dept head boleh mengisi pagu anggaran (app_settings)
-- ============================================================

DROP POLICY IF EXISTS "settings_insert_kadiv" ON app_settings;
DROP POLICY IF EXISTS "settings_update_kadiv" ON app_settings;

CREATE POLICY "settings_insert_all" ON app_settings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "settings_update_all" ON app_settings
  FOR UPDATE USING (auth.uid() IS NOT NULL);
