-- ============================================================
-- 012: kategori pengeluaran baru — Sewa Kendaraan
-- ============================================================

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_category_check
  CHECK (category IN ('tiket', 'honor', 'hotel', 'sewa_kendaraan', 'lainnya'));
