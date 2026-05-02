-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('kadiv', 'dept_head', 'staff')),
  dept_id uuid references departments(id),
  created_at timestamptz default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  dept_id uuid not null references departments(id) on delete cascade,
  title text not null,
  description text,
  start_date timestamptz not null,
  end_date timestamptz not null,
  status text not null default 'belum_mulai'
    check (status in ('belum_mulai', 'berjalan', 'selesai', 'ditunda')),
  output_notes text,
  created_by uuid not null references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  author_id uuid not null references profiles(id),
  content text not null,
  created_at timestamptz default now()
);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  uploaded_by uuid not null references profiles(id),
  created_at timestamptz default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null check (type in ('status_change', 'new_comment', 'deadline_reminder')),
  activity_id uuid references activities(id) on delete set null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger activities_updated_at
  before update on activities
  for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table departments enable row level security;
alter table profiles enable row level security;
alter table activities enable row level security;
alter table comments enable row level security;
alter table attachments enable row level security;
alter table notifications enable row level security;

-- Helper function: get current user role
create or replace function get_my_role()
returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

-- Helper function: get current user dept_id
create or replace function get_my_dept_id()
returns uuid as $$
  select dept_id from profiles where id = auth.uid();
$$ language sql security definer stable;

-- departments: everyone can read
create policy "departments_select" on departments for select using (auth.uid() is not null);

-- profiles: users can read all profiles, only update their own
create policy "profiles_select" on profiles for select using (auth.uid() is not null);
create policy "profiles_insert" on profiles for insert with check (id = auth.uid());
create policy "profiles_update" on profiles for update using (id = auth.uid());

-- activities: kadiv sees all; dept_head/staff only see their dept
create policy "activities_select_kadiv" on activities for select
  using (get_my_role() = 'kadiv');
create policy "activities_select_dept" on activities for select
  using (get_my_role() in ('dept_head', 'staff') and dept_id = get_my_dept_id());

-- activities: dept_head can CRUD their dept; staff can INSERT/UPDATE only
create policy "activities_insert" on activities for insert
  with check (get_my_role() in ('dept_head', 'staff') and dept_id = get_my_dept_id());
create policy "activities_update" on activities for update
  using (get_my_role() in ('dept_head', 'staff') and dept_id = get_my_dept_id());
create policy "activities_delete" on activities for delete
  using (get_my_role() = 'dept_head' and dept_id = get_my_dept_id());

-- comments: kadiv can INSERT on all; dept_head can INSERT on their dept activities; all can SELECT
create policy "comments_select" on comments for select using (auth.uid() is not null);
create policy "comments_insert_kadiv" on comments for insert
  with check (get_my_role() = 'kadiv');
create policy "comments_insert_dept" on comments for insert
  with check (
    get_my_role() in ('dept_head') and
    exists (select 1 from activities a where a.id = activity_id and a.dept_id = get_my_dept_id())
  );

-- attachments: kadiv can see all; dept_head/staff can CRUD in their dept
create policy "attachments_select_kadiv" on attachments for select
  using (get_my_role() = 'kadiv');
create policy "attachments_select_dept" on attachments for select
  using (
    get_my_role() in ('dept_head', 'staff') and
    exists (select 1 from activities a where a.id = activity_id and a.dept_id = get_my_dept_id())
  );
create policy "attachments_insert" on attachments for insert
  with check (
    get_my_role() in ('dept_head', 'staff') and
    exists (select 1 from activities a where a.id = activity_id and a.dept_id = get_my_dept_id())
  );
create policy "attachments_delete" on attachments for delete
  using (get_my_role() = 'dept_head' and uploaded_by = auth.uid());

-- notifications: users only see their own
create policy "notifications_select" on notifications for select
  using (user_id = auth.uid());
create policy "notifications_update" on notifications for update
  using (user_id = auth.uid());
-- System can insert notifications via service_role

-- ============================================================
-- SEED DATA
-- ============================================================

insert into departments (name) values
  ('Litigasi'),
  ('Non-Litigasi'),
  ('Konsultasi & Legal Opinion'),
  ('Asset Dispute');

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

-- Run this in Supabase dashboard or via API:
-- insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false);
