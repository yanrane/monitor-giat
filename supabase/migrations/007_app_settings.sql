-- ============================================================
-- 007: app_settings — penyimpanan setelan (a.l. pagu anggaran)
-- ============================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key        text        PRIMARY KEY,
  value      text        NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select_all" ON app_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "settings_insert_kadiv" ON app_settings
  FOR INSERT WITH CHECK (get_my_role() = 'kadiv');

CREATE POLICY "settings_update_kadiv" ON app_settings
  FOR UPDATE USING (get_my_role() = 'kadiv');
