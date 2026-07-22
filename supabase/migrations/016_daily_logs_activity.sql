-- ============================================================
-- 016: Log harian terhubung ke kegiatan utama
--  - kolom activity_id (nullable) → catatan log menunjuk kegiatan induk
--  - hapus UNIQUE (user_id, log_date) → boleh beberapa catatan per hari
--    (satu catatan per kegiatan yang dikerjakan hari itu)
-- Idempoten & additive — data lama (activity_id NULL) tetap tampil normal.
-- ============================================================

ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS activity_id uuid REFERENCES activities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS daily_logs_activity_idx ON daily_logs(activity_id);

ALTER TABLE daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_user_id_log_date_key;
