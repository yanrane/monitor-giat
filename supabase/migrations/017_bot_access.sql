-- ============================================================
-- 017: Akses bot read-only (Grok Bot per Kabid)
--  - bot_tokens: satu token per bot, hash-only (token asli tidak
--    pernah disimpan), bisa dicabut kapan saja lewat is_active.
--  - bot_access_logs: jejak pemakaian token untuk audit.
--  - RLS aktif TANPA policy → hanya service_role (API route) yang
--    bisa baca/tulis tabel ini. anon/authenticated ditolak.
-- Idempoten & additive.
-- ============================================================

CREATE TABLE IF NOT EXISTS bot_tokens (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  label          text        NOT NULL UNIQUE,          -- mis. "bot-kabid-litigasi"
  owner_name     text,                                  -- nama Kabid pemilik bot
  dept_id        uuid        REFERENCES departments(id) ON DELETE SET NULL,
  token_hash     text        NOT NULL UNIQUE,           -- sha256(token)
  token_prefix   text        NOT NULL,                  -- 8 karakter awal, untuk identifikasi
  scope          text        NOT NULL DEFAULT 'all'
                   CHECK (scope IN ('all', 'dept')),
  can_read       boolean     NOT NULL DEFAULT true,
  can_write      boolean     NOT NULL DEFAULT false,
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz DEFAULT now(),
  last_used_at   timestamptz,
  request_count  bigint      NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_bot_tokens_hash
  ON bot_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_bot_tokens_active
  ON bot_tokens (is_active);

CREATE TABLE IF NOT EXISTS bot_access_logs (
  id         bigserial   PRIMARY KEY,
  token_id   uuid        REFERENCES bot_tokens(id) ON DELETE CASCADE,
  endpoint   text        NOT NULL,
  format     text,
  ok         boolean     NOT NULL DEFAULT true,
  note       text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_access_logs_token_time
  ON bot_access_logs (token_id, created_at DESC);

ALTER TABLE bot_tokens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_access_logs  ENABLE ROW LEVEL SECURITY;

-- Tidak ada policy sama sekali: service_role bypass RLS, sementara
-- anon/authenticated tidak dapat mengakses apa pun.
REVOKE ALL ON bot_tokens      FROM anon, authenticated;
REVOKE ALL ON bot_access_logs FROM anon, authenticated;
