-- ============================================================
-- 014: Legal Command System — kendali eksekusi kegiatan
-- Prioritas, status kendali, blocker, next action, dan jejak
-- update substansi terakhir per kegiatan.
--
-- Idempoten: SQL ini pernah dijalankan langsung di production
-- (kolom sudah ada di sana) — ADD COLUMN IF NOT EXISTS /
-- CREATE INDEX IF NOT EXISTS membuat re-run aman, dan deployment
-- baru tetap mendapat kolom + constraint + index lengkap.
-- ============================================================

-- 1. Kolom kendali pada activities
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'p2'
    CHECK (priority IN ('p1', 'p2', 'p3')),
  ADD COLUMN IF NOT EXISTS control_status text
    CHECK (control_status IN (
      'on_track', 'waiting_internal', 'waiting_external',
      'needs_kadiv_decision', 'blocked', 'escalated'
    )),
  ADD COLUMN IF NOT EXISTS blocker text,
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_action_due_date date,
  ADD COLUMN IF NOT EXISTS decision_needed text,
  ADD COLUMN IF NOT EXISTS last_substantive_update_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_substantive_update_by uuid
    REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Backfill aman untuk data lama:
--    - priority terisi 'p2' otomatis lewat DEFAULT (klasifikasi P1 dilakukan manual)
--    - baseline update substansi = updated_at saat ini, agar kegiatan lama
--      tidak langsung ditandai stale pada deployment pertama
UPDATE activities
SET last_substantive_update_at = updated_at
WHERE status <> 'selesai'
  AND last_substantive_update_at IS NULL;

-- 3. Index untuk query dashboard (decision queue + deteksi stale)
CREATE INDEX IF NOT EXISTS idx_activities_priority
  ON activities (priority);

CREATE INDEX IF NOT EXISTS idx_activities_control_status
  ON activities (control_status)
  WHERE control_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_stale_check
  ON activities (last_substantive_update_at)
  WHERE status NOT IN ('selesai', 'ditunda');

-- RLS: tidak ada perubahan policy — kolom baru otomatis tercakup
-- policy activities yang sudah ada (select/insert/update per dept & kadiv).
