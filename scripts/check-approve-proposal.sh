#!/bin/sh
# Uji migration 018 + approve_proposal di Postgres lokal sementara (butuh initdb/pg_ctl/psql, mis. postgresql@16).
# Tidak menyentuh database Supabase. Jalankan: sh scripts/check-approve-proposal.sh
set -eu
export LC_ALL=C LANG=C
ROOT=$(cd "$(dirname "$0")/.." && pwd)
TMP=$(mktemp -d)
PORT=${PGTEST_PORT:-54329}
trap 'pg_ctl -D "$TMP/db" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT

initdb -D "$TMP/db" -U postgres --auth=trust --no-locale -E UTF8 >/dev/null
pg_ctl -D "$TMP/db" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" -w start >/dev/null

run() { psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f "$1"; }
run "$ROOT/supabase/tests/supabase-stub.sql"
for m in 005_progress_items 017_bot_access 018_progress_proposals 018_progress_proposals; do run "$ROOT/supabase/migrations/$m.sql"; done  # 018 dua kali: harus bisa dijalankan ulang
run "$ROOT/supabase/tests/approve_proposal.test.sql"
echo "check-approve-proposal: OK"
