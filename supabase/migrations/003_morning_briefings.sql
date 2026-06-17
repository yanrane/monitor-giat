-- ============================================================
-- 003: Morning Briefings + extended notification types
-- ============================================================

-- 1. Extend notification type-check to include 'briefing'
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('status_change', 'new_comment', 'deadline_reminder', 'briefing'));

-- 2. Create morning_briefings table
CREATE TABLE IF NOT EXISTS morning_briefings (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_date  date        NOT NULL UNIQUE,
  viral_news     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  evaluations    jsonb       NOT NULL DEFAULT '[]'::jsonb,
  overall_insight text,
  generated_by  text        DEFAULT 'kevin',
  created_at    timestamptz DEFAULT now()
);

-- 3. Row Level Security
ALTER TABLE morning_briefings ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read all briefings
CREATE POLICY "morning_briefings_select" ON morning_briefings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only service_role / admin can insert
CREATE POLICY "morning_briefings_insert" ON morning_briefings
  FOR INSERT WITH CHECK (get_my_role() = 'kadiv');

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_morning_briefings_date
  ON morning_briefings (briefing_date DESC);

-- 5. Departments sort_order (in case it was missed)
ALTER TABLE departments ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;
UPDATE departments SET sort_order = 1 WHERE name = 'Litigasi';
UPDATE departments SET sort_order = 2 WHERE name = 'Non-Litigasi';
UPDATE departments SET sort_order = 3 WHERE name = 'Konsultasi & Legal Opinion';
UPDATE departments SET sort_order = 4 WHERE name = 'Asset Dispute';
UPDATE departments SET sort_order = 5 WHERE name = 'Administrasi'
  AND sort_order = 0;
