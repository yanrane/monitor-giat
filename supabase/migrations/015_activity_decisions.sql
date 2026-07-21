-- ============================================================
-- 015: Kadiv Decision Panel — riwayat keputusan append-only
--
-- Kadiv tidak punya policy UPDATE pada activities (by design,
-- lihat 001). Keputusan Kadiv karena itu dijalankan lewat fungsi
-- SECURITY DEFINER yang:
--   1. mencatat keputusan ke activity_decisions (append-only),
--   2. meng-update HANYA kolom kendali pada activities
--      (control_status, decision_needed, next_action,
--       next_action_due_date, jejak update substansi),
-- dalam satu transaksi. Status lifecycle (belum_mulai/berjalan/
-- selesai/ditunda) tidak pernah disentuh fungsi ini.
-- ============================================================

-- 1. Tabel riwayat keputusan (append-only)
create table if not exists activity_decisions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  action text not null check (action in (
    'approve_continue', 'beri_arahan', 'minta_klarifikasi', 'eskalasi_kembalikan'
  )),
  instruction text not null check (length(btrim(instruction)) > 0),
  -- snapshot permintaan keputusan saat diputuskan (audit trail,
  -- karena decision_needed di activities di-clear setelah diputuskan)
  decision_needed_snapshot text,
  -- needs_kadiv_decision & escalated dilarang: setiap keputusan harus
  -- mengeluarkan kegiatan dari antrean keputusan Kadiv di dashboard
  resulting_control_status text not null check (resulting_control_status in (
    'on_track', 'waiting_internal', 'waiting_external', 'blocked'
  )),
  next_action text,
  next_action_due_date date,
  decided_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_decisions_activity
  on activity_decisions (activity_id, created_at desc);

-- 2. RLS — konsisten dengan pola activities/attachments di 001:
--    kadiv lihat semua, dept_head/staff hanya kegiatan dept sendiri.
--    Append-only: tidak ada policy insert/update/delete — satu-satunya
--    jalur tulis adalah fungsi apply_kadiv_decision di bawah.
alter table activity_decisions enable row level security;

create policy "activity_decisions_select_kadiv" on activity_decisions for select
  using (get_my_role() = 'kadiv');
create policy "activity_decisions_select_dept" on activity_decisions for select
  using (
    get_my_role() in ('dept_head', 'staff') and
    exists (select 1 from activities a where a.id = activity_id and a.dept_id = get_my_dept_id())
  );

-- 3. Fungsi keputusan Kadiv — transaksional & column-scoped
create or replace function apply_kadiv_decision(
  p_activity_id uuid,
  p_action text,
  p_instruction text,
  p_resulting_control_status text,
  p_next_action text default null,
  p_next_action_due_date date default null
)
returns activity_decisions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity activities%rowtype;
  v_decision activity_decisions%rowtype;
begin
  if get_my_role() is distinct from 'kadiv' then
    raise exception 'Hanya Kadiv yang dapat memberikan keputusan';
  end if;

  if p_instruction is null or btrim(p_instruction) = '' then
    raise exception 'Instruksi/keputusan wajib diisi';
  end if;

  select * into v_activity from activities where id = p_activity_id for update;
  if not found then
    raise exception 'Kegiatan tidak ditemukan';
  end if;

  -- nilai action & resulting_control_status divalidasi oleh
  -- CHECK constraint tabel saat insert
  insert into activity_decisions (
    activity_id, action, instruction, decision_needed_snapshot,
    resulting_control_status, next_action, next_action_due_date, decided_by
  ) values (
    p_activity_id, p_action, btrim(p_instruction), v_activity.decision_needed,
    p_resulting_control_status,
    nullif(btrim(coalesce(p_next_action, '')), ''),
    p_next_action_due_date,
    auth.uid()
  )
  returning * into v_decision;

  update activities set
    control_status             = p_resulting_control_status,
    decision_needed            = null,
    next_action                = coalesce(v_decision.next_action, next_action),
    next_action_due_date       = coalesce(p_next_action_due_date, next_action_due_date),
    last_substantive_update_at = now(),
    last_substantive_update_by = auth.uid()
  where id = p_activity_id;

  return v_decision;
end;
$$;
