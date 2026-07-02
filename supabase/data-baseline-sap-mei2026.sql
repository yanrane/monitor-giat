-- 010 (DATA): baseline realisasi SAP s.d Mei 2026 — OPEX (basis pagu) + CAPEX
-- Sumber: 7500- Legal 0526.xlsx (sheet Database) & Laporan Monitoring CAPEX Mei 2026
DO $$
DECLARE kadiv_id uuid;
BEGIN
  SELECT id INTO kadiv_id FROM profiles WHERE role = 'kadiv' LIMIT 1;
  INSERT INTO expenses (category, budget_type, description, amount, expense_date, recipient_name, created_by) VALUES
  ('lainnya', 'opex', '[SAP s.d Mei 2026] Biaya perizinan', 2350275077, '2026-05-31', 'PT Timah (SAP)', kadiv_id),
  ('honor', 'opex', '[SAP s.d Mei 2026] Biaya jasa konsultan', 1556592088, '2026-05-31', 'PT Timah (SAP)', kadiv_id),
  ('honor', 'opex', '[SAP s.d Mei 2026] Jasa pihak ke 3', 1463297295, '2026-05-31', 'PT Timah (SAP)', kadiv_id),
  ('lainnya', 'opex', '[SAP s.d Mei 2026] By jamuan relasi', 691444914, '2026-05-31', 'PT Timah (SAP)', kadiv_id),
  ('tiket', 'opex', '[SAP s.d Mei 2026] Biaya ticket perjalanan dinas', 158587032, '2026-05-31', 'PT Timah (SAP)', kadiv_id),
  ('lainnya', 'opex', '[SAP s.d Mei 2026] Biaya perjalanan dinas', 73030000, '2026-05-31', 'PT Timah (SAP)', kadiv_id),
  ('hotel', 'opex', '[SAP s.d Mei 2026] By penginapan', 51145563, '2026-05-31', 'PT Timah (SAP)', kadiv_id),
  ('lainnya', 'opex', '[SAP s.d Mei 2026] Biaya alat tulis kantor', 40498631, '2026-05-31', 'PT Timah (SAP)', kadiv_id),
  ('lainnya', 'opex', '[SAP s.d Mei 2026] Biaya mass media', 36600000, '2026-05-31', 'PT Timah (SAP)', kadiv_id),
  ('lainnya', 'opex', '[SAP s.d Mei 2026] Biaya angkutan', 25714650, '2026-05-31', 'PT Timah (SAP)', kadiv_id),
  ('lainnya', 'opex', '[SAP s.d Mei 2026] By perjalanan tamu', 25192896, '2026-05-31', 'PT Timah (SAP)', kadiv_id),
  ('lainnya', 'opex', '[SAP s.d Mei 2026] Biaya rapat/lokakarya/seminar', 23921720, '2026-05-31', 'PT Timah (SAP)', kadiv_id),
  ('lainnya', 'opex', '[SAP s.d Mei 2026] By transportasi perjalanan dinas', 19045314, '2026-05-31', 'PT Timah (SAP)', kadiv_id),
  ('lainnya', 'opex', '[SAP s.d Mei 2026] Pembel inventaris nilai 10 juta kebawah', 8750000, '2026-05-31', 'PT Timah (SAP)', kadiv_id),
  ('lainnya', 'opex', '[SAP s.d Mei 2026] Biaya survey', 1736000, '2026-05-31', 'PT Timah (SAP)', kadiv_id),
  ('lainnya', 'opex', '[SAP s.d Mei 2026] Biaya pengiriman/benda pos', 800650, '2026-05-31', 'PT Timah (SAP)', kadiv_id),
  ('lainnya', 'capex', '[SAP s.d Mei 2026] Perpanjangan Sertifikat Kepri', 814500000, '2026-03-31', 'PT Timah (SAP)', kadiv_id),
  ('lainnya', 'capex', '[SAP s.d Mei 2026] Perpanjangan Sertifikat Kota Pangkalpinang', 125000000, '2026-03-31', 'PT Timah (SAP)', kadiv_id),
  ('lainnya', 'capex', '[SAP s.d Mei 2026] Perpanjangan Sertifikat Kota Pangkalpinang', 700000000, '2026-04-30', 'PT Timah (SAP)', kadiv_id),
  ('lainnya', 'capex', '[SAP s.d Mei 2026] Perpanjangan Sertifikat Kota Pangkalpinang', 183000000, '2026-05-31', 'PT Timah (SAP)', kadiv_id),
  ('lainnya', 'capex', '[SAP s.d Mei 2026] Perpanjangan Sertifikat Kab. Bangka', 593156000, '2026-04-30', 'PT Timah (SAP)', kadiv_id),
  ('lainnya', 'capex', '[SAP s.d Mei 2026] Perpanjangan Sertifikat Kab. Bangka', 372000000, '2026-05-31', 'PT Timah (SAP)', kadiv_id);
END $$;