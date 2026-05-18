-- ============================================================
-- 003: Restrict client-side profile updates
-- ============================================================
-- Users may edit their own display name, but role/dept changes must go
-- through server-side admin actions using the service role.

DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'staff';

-- Remove broad table-level INSERT/UPDATE privileges from authenticated clients
-- so PostgREST cannot set or mutate sensitive columns such as role directly.
-- Public self-registration may still create a staff profile with name + dept.
REVOKE INSERT, UPDATE ON profiles FROM authenticated;
GRANT INSERT (id, full_name, dept_id) ON profiles TO authenticated;
GRANT UPDATE (full_name) ON profiles TO authenticated;

-- Keep service-role/admin access explicit for server-side admin flows.
GRANT INSERT, UPDATE ON profiles TO service_role;
