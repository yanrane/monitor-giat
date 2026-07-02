-- ============================================================
-- 004: progress_items — Monitor Progress
-- Kadiv input item pekerjaan, tugaskan PIC, set target selesai.
-- ============================================================

CREATE TABLE IF NOT EXISTS progress_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  pic_id       uuid        NOT NULL REFERENCES profiles(id),
  target_date  date        NOT NULL,
  status       text        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'done')),
  completed_at timestamptz,
  created_by   uuid        NOT NULL REFERENCES profiles(id),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE TRIGGER progress_items_updated_at
  BEFORE UPDATE ON progress_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE progress_items ENABLE ROW LEVEL SECURITY;

-- Semua user login bisa lihat
CREATE POLICY "progress_select_all" ON progress_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Hanya Kadiv yang bisa input
CREATE POLICY "progress_insert_kadiv" ON progress_items
  FOR INSERT WITH CHECK (get_my_role() = 'kadiv' AND created_by = auth.uid());

-- Kadiv atau PIC yang ditugaskan bisa update (tandai selesai)
CREATE POLICY "progress_update" ON progress_items
  FOR UPDATE USING (get_my_role() = 'kadiv' OR pic_id = auth.uid());

-- Hanya Kadiv yang bisa hapus
CREATE POLICY "progress_delete_kadiv" ON progress_items
  FOR DELETE USING (get_my_role() = 'kadiv');
