-- ============================================================
-- 013: Kolom lokasi pada daily_logs
-- ============================================================
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS location text;
