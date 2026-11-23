-- ============================================================
-- 018: progress_proposals — usulan target dari disposisi TEO
-- Agent (KEVIN) mengusulkan lewat POST /api/bot/proposals (service_role);
-- Kadiv menyetujui di /usulan/[id] → baru dibuat progress_items.
-- Spec: docs/superpowers/specs/2026-11-23-usulan-disposisi-teo-design.md
-- JALANKAN SEBELUM DEPLOY KODE (authorizeBotToken membaca can_propose).
-- ============================================================

CREATE TABLE IF NOT EXISTS progress_proposals (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  teo_ref           text        NOT NULL UNIQUE CHECK (char_length(teo_ref) BETWEEN 1 AND 100),
  teo_tanggal       date,
  perihal           text        NOT NULL CHECK (char_length(perihal) BETWEEN 1 AND 300),
  instruksi         text        CHECK (instruksi IS NULL OR char_length(instruksi) <= 1000),
  judul             text        NOT NULL CHECK (char_length(judul) BETWEEN 1 AND 200),
  pic_ids           uuid[]      NOT NULL CHECK (cardinality(pic_ids) >= 1),
  target_date       date        NOT NULL,
  alasan_tenggat    text        CHECK (alasan_tenggat IS NULL OR char_length(alasan_tenggat) <= 300),
  status            text        NOT NULL DEFAULT 'menunggu'
                      CHECK (status IN ('menunggu', 'disetujui', 'ditolak')),
  proposed_by_token uuid        REFERENCES bot_tokens(id) ON DELETE SET NULL,
  decided_by        uuid        REFERENCES profiles(id),
  decided_at        timestamptz,
  alasan_tolak      text        CHECK (alasan_tolak IS NULL OR char_length(alasan_tolak) <= 300),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS progress_proposals_status_created
  ON progress_proposals (status, created_at);

ALTER TABLE progress_proposals ENABLE ROW LEVEL SECURITY;

-- Hanya Kadiv yang bisa melihat dan memutus usulan.
-- Tanpa policy INSERT/DELETE: insert hanya lewat API bot (service_role).
CREATE POLICY "proposals_select_kadiv" ON progress_proposals
  FOR SELECT USING (get_my_role() = 'kadiv');

CREATE POLICY "proposals_update_kadiv" ON progress_proposals
  FOR UPDATE USING (get_my_role() = 'kadiv');

-- Rujukan item ke usulan asalnya (null untuk item manual)
ALTER TABLE progress_items
  ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES progress_proposals(id) ON DELETE SET NULL;

-- Izin eksplisit bot untuk mengusulkan; terpisah dari can_write
ALTER TABLE bot_tokens
  ADD COLUMN IF NOT EXISTS can_propose boolean NOT NULL DEFAULT false;

-- Persetujuan atomik: klaim usulan + buat item per PIC dalam satu transaksi.
-- SECURITY INVOKER → RLS tetap berlaku sebagai Kadiv yang login. Mengembalikan 0 bila
-- usulan sudah diputus / bukan Kadiv (klik ganda aman), 1 bila berhasil; error → semua batal.
CREATE OR REPLACE FUNCTION approve_proposal(p_id uuid, p_judul text, p_pic_ids uuid[], p_target date)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE progress_proposals
     SET status = 'disetujui', decided_by = auth.uid(), decided_at = now(),
         judul = p_judul, pic_ids = p_pic_ids, target_date = p_target
   WHERE id = p_id AND status = 'menunggu';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RETURN 0; END IF;

  INSERT INTO progress_items (title, pic_id, target_date, created_by, proposal_id)
  SELECT p_judul, pic, p_target, auth.uid(), p_id FROM unnest(p_pic_ids) AS pic;
  RETURN n;
END $$;
