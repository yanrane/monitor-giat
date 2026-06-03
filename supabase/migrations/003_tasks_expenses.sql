-- ============================================================
-- 003: tasks (sub-tasks per activity) + expenses (division-wide)
-- ============================================================

-- 1. TASKS table — work items within an activity/project
CREATE TABLE IF NOT EXISTS tasks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid        NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  due_date    date,
  status      text        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'done')),
  notes       text,
  created_by  uuid        NOT NULL REFERENCES profiles(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Kadiv sees all tasks
CREATE POLICY "tasks_select_kadiv" ON tasks
  FOR SELECT USING (get_my_role() = 'kadiv');

-- Dept head/staff see tasks for activities in their dept
CREATE POLICY "tasks_select_dept" ON tasks
  FOR SELECT USING (
    get_my_role() IN ('dept_head', 'staff') AND
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_id AND a.dept_id = get_my_dept_id()
    )
  );

-- Dept head/staff can insert tasks in their dept activities
CREATE POLICY "tasks_insert" ON tasks
  FOR INSERT WITH CHECK (
    get_my_role() IN ('dept_head', 'staff') AND
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_id AND a.dept_id = get_my_dept_id()
    )
  );

-- Dept head/staff can update tasks in their dept
CREATE POLICY "tasks_update" ON tasks
  FOR UPDATE USING (
    get_my_role() IN ('dept_head', 'staff') AND
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_id AND a.dept_id = get_my_dept_id()
    )
  );

-- Dept head can delete tasks in their dept; staff only their own
CREATE POLICY "tasks_delete" ON tasks
  FOR DELETE USING (
    (get_my_role() = 'dept_head' AND EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_id AND a.dept_id = get_my_dept_id()
    )) OR
    (get_my_role() = 'staff' AND created_by = auth.uid())
  );

-- ============================================================
-- 2. EXPENSES table — division-wide expense reporting
-- ============================================================

CREATE TABLE IF NOT EXISTS expenses (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category       text        NOT NULL
                   CHECK (category IN ('tiket', 'honor', 'hotel', 'lainnya')),
  description    text        NOT NULL,
  amount         bigint      NOT NULL CHECK (amount >= 0),
  expense_date   date        NOT NULL DEFAULT CURRENT_DATE,
  recipient_name text,
  created_by     uuid        NOT NULL REFERENCES profiles(id),
  dept_id        uuid        REFERENCES departments(id),
  attachment_url text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Kadiv sees all expenses
CREATE POLICY "expenses_select_kadiv" ON expenses
  FOR SELECT USING (get_my_role() = 'kadiv');

-- Dept head sees expenses from their dept
CREATE POLICY "expenses_select_dept_head" ON expenses
  FOR SELECT USING (
    get_my_role() = 'dept_head' AND dept_id = get_my_dept_id()
  );

-- Staff sees their own expenses
CREATE POLICY "expenses_select_own" ON expenses
  FOR SELECT USING (
    get_my_role() = 'staff' AND created_by = auth.uid()
  );

-- Dept head/staff can insert expenses
CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK (
    get_my_role() IN ('dept_head', 'staff') AND
    created_by = auth.uid()
  );

-- Can update own expenses
CREATE POLICY "expenses_update_own" ON expenses
  FOR UPDATE USING (created_by = auth.uid());

-- Dept head can delete any expense from their dept; staff only their own
CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE USING (
    (get_my_role() = 'dept_head' AND dept_id = get_my_dept_id()) OR
    (get_my_role() = 'staff' AND created_by = auth.uid())
  );

-- ============================================================
-- 3. Add sort_order to departments if missing
-- ============================================================
ALTER TABLE departments ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;

UPDATE departments SET sort_order = 1 WHERE name = 'Litigasi' AND sort_order = 0;
UPDATE departments SET sort_order = 2 WHERE name = 'Non-Litigasi' AND sort_order = 0;
UPDATE departments SET sort_order = 3 WHERE name = 'Konsultasi & Legal Opinion' AND sort_order = 0;
UPDATE departments SET sort_order = 4 WHERE name = 'Asset Dispute' AND sort_order = 0;
