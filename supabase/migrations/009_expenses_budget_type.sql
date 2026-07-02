-- ============================================================
-- 009: pisahkan pengeluaran OPEX vs CAPEX
-- Data lama otomatis dianggap OPEX.
-- ============================================================

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS budget_type text NOT NULL DEFAULT 'opex'
  CHECK (budget_type IN ('opex', 'capex'));
