-- Stub minimal lingkungan Supabase untuk menguji migration di Postgres lokal.
-- BUKAN untuk production. Dipakai scripts/check-approve-proposal.sh.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;

CREATE SCHEMA auth;
-- auth.uid() diambil dari setting sesi: SELECT set_config('test.uid', '<uuid>', false)
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated;

-- Seperti Supabase: tabel baru otomatis diberi hak ke anon/authenticated, dijaga RLS
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;

CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL,
  role text NOT NULL,
  dept_id uuid REFERENCES departments(id),
  is_active boolean NOT NULL DEFAULT true
);

CREATE FUNCTION get_my_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
  AS $$ SELECT role FROM profiles WHERE id = auth.uid() $$;

CREATE FUNCTION update_updated_at() RETURNS trigger LANGUAGE plpgsql
  AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
