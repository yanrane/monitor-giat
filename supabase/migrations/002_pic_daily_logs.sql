-- ============================================================
-- 002: PIC on activities + daily_logs table
-- ============================================================

-- 1. Add pic_id to activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS pic_id uuid REFERENCES profiles(id);

-- 2. Allow staff to delete their own activities
DROP POLICY IF EXISTS "activities_delete" ON activities;
CREATE POLICY "activities_delete" ON activities FOR DELETE
  USING (
    (get_my_role() = 'dept_head' AND dept_id = get_my_dept_id()) OR
    (get_my_role() = 'staff' AND created_by = auth.uid())
  );

-- 3. Allow staff to insert comments on activities in their dept
CREATE POLICY "comments_insert_staff" ON comments FOR INSERT
  WITH CHECK (
    get_my_role() = 'staff' AND
    exists (select 1 from activities a where a.id = activity_id and a.dept_id = get_my_dept_id())
  );

-- 4. Create daily_logs table
CREATE TABLE IF NOT EXISTS daily_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date   date        NOT NULL DEFAULT CURRENT_DATE,
  content    text        NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, log_date)
);

CREATE TRIGGER daily_logs_updated_at
  BEFORE UPDATE ON daily_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- Staff/dept_head see own logs
CREATE POLICY "daily_logs_select_own" ON daily_logs
  FOR SELECT USING (user_id = auth.uid());

-- Dept head sees all logs from their dept members
CREATE POLICY "daily_logs_select_dept_head" ON daily_logs
  FOR SELECT USING (
    get_my_role() = 'dept_head' AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = user_id AND p.dept_id = get_my_dept_id())
  );

-- Kadiv sees all logs
CREATE POLICY "daily_logs_select_kadiv" ON daily_logs
  FOR SELECT USING (get_my_role() = 'kadiv');

-- Anyone (except kadiv) can insert their own log
CREATE POLICY "daily_logs_insert" ON daily_logs
  FOR INSERT WITH CHECK (user_id = auth.uid() AND get_my_role() != 'kadiv');

-- Can only update own log
CREATE POLICY "daily_logs_update" ON daily_logs
  FOR UPDATE USING (user_id = auth.uid());

-- Can only delete own log
CREATE POLICY "daily_logs_delete" ON daily_logs
  FOR DELETE USING (user_id = auth.uid());
