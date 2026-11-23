-- Uji approve_proposal (migration 018): hanya Kadiv, sekali saja, dan atomik.
-- Dijalankan oleh scripts/check-approve-proposal.sh setelah stub + migration 005/017/018.
INSERT INTO profiles (id, full_name, role) VALUES
  ('00000000-0000-4000-8000-0000000000aa', 'Kadiv', 'kadiv'),
  ('00000000-0000-4000-8000-0000000000bb', 'PIC', 'staff'),
  ('00000000-0000-4000-8000-0000000000cc', 'Staf lain', 'staff');

INSERT INTO progress_proposals (id, teo_ref, perihal, judul, pic_ids, target_date) VALUES
  ('00000000-0000-4000-8000-000000000001', 'UJI-1', 'perihal', 'judul usulan',
   ARRAY['00000000-0000-4000-8000-0000000000bb']::uuid[], '2030-01-01'),
  ('00000000-0000-4000-8000-000000000002', 'UJI-2', 'perihal', 'judul usulan',
   ARRAY['00000000-0000-4000-8000-0000000000bb']::uuid[], '2030-01-01');

SET ROLE authenticated;

-- 1. Bukan Kadiv: RLS membuat klaim tidak mengenai baris apa pun
SELECT set_config('test.uid', '00000000-0000-4000-8000-0000000000cc', false);
DO $$ BEGIN
  IF approve_proposal('00000000-0000-4000-8000-000000000001', 'J', ARRAY['00000000-0000-4000-8000-0000000000bb']::uuid[], '2030-01-02') <> 0
  THEN RAISE EXCEPTION 'GAGAL: non-Kadiv bisa menyetujui'; END IF;
END $$;

-- 2. Kadiv menyetujui: 1 usulan diklaim, 1 item dibuat atas nama Kadiv dengan isi hasil edit
SELECT set_config('test.uid', '00000000-0000-4000-8000-0000000000aa', false);
DO $$ BEGIN
  IF approve_proposal('00000000-0000-4000-8000-000000000001', 'Judul final', ARRAY['00000000-0000-4000-8000-0000000000bb']::uuid[], '2030-01-02') <> 1
  THEN RAISE EXCEPTION 'GAGAL: Kadiv tidak bisa menyetujui'; END IF;
END $$;

-- 3. Disetujui lagi (klik ganda / tab kedua): 0, item tidak dobel
DO $$ BEGIN
  IF approve_proposal('00000000-0000-4000-8000-000000000001', 'Judul final', ARRAY['00000000-0000-4000-8000-0000000000bb']::uuid[], '2030-01-02') <> 0
  THEN RAISE EXCEPTION 'GAGAL: usulan bisa disetujui dua kali'; END IF;
END $$;

-- 4. Atomik: insert item gagal (PIC tidak ada → FK) → status tetap 'menunggu'
DO $$ BEGIN
  BEGIN
    PERFORM approve_proposal('00000000-0000-4000-8000-000000000002', 'J', ARRAY['00000000-0000-4000-8000-0000000000ff']::uuid[], '2030-01-02');
    RAISE EXCEPTION 'GAGAL: insert item dengan PIC fiktif tidak error';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
END $$;

RESET ROLE;

DO $$
DECLARE n int; st text; t text; who uuid;
BEGIN
  SELECT count(*), max(title), max(created_by::text)::uuid INTO n, t, who
    FROM progress_items WHERE proposal_id = '00000000-0000-4000-8000-000000000001';
  IF n <> 1 OR t <> 'Judul final' OR who <> '00000000-0000-4000-8000-0000000000aa'
  THEN RAISE EXCEPTION 'GAGAL: item usulan 1 = % baris, judul %, pembuat %', n, t, who; END IF;

  SELECT status INTO st FROM progress_proposals WHERE id = '00000000-0000-4000-8000-000000000001';
  IF st <> 'disetujui' THEN RAISE EXCEPTION 'GAGAL: status usulan 1 = %', st; END IF;

  SELECT status INTO st FROM progress_proposals WHERE id = '00000000-0000-4000-8000-000000000002';
  SELECT count(*) INTO n FROM progress_items WHERE proposal_id = '00000000-0000-4000-8000-000000000002';
  IF st <> 'menunggu' OR n <> 0 THEN RAISE EXCEPTION 'GAGAL: tidak atomik — status %, item %', st, n; END IF;
END $$;
