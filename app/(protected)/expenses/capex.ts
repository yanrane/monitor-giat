// Anggaran CAPEX Divisi Legal — Perpanjangan & Pembaharuan HGB.
// Sumber: "CAPEX Tahun 2026 - Legal acc.xlsx" (RKAP 2026), diinput 2026-07-02.
// Angka RKAP tahunan — kalau ada revisi RKAP, update daftar ini.

export interface CapexItem {
  name: string
  amount: number
}

export const CAPEX_TITLE = 'Anggaran CAPEX — Perpanjangan & Pembaharuan HGB'
export const CAPEX_YEAR = 'RKAP 2026'

export const CAPEX_ITEMS: CapexItem[] = [
  { name: 'Perpanjangan Sertifikat Kab. Bangka — 749.266 m²', amount: 9_360_000_000 },
  { name: 'Perpanjangan Sertifikat Kab. Bangka Barat — 1.568.362 m²', amount: 12_800_000_000 },
  { name: 'Perpanjangan Sertifikat Kab. Belitung — 1.570.315 m²', amount: 3_560_000_000 },
  { name: 'Perpanjangan Sertifikat Kota Pangkalpinang — 398.520 m²', amount: 4_000_000_000 },
  { name: 'Perpanjangan Sertifikat Bangka Selatan — 73.650 m²', amount: 1_480_000_000 },
  { name: 'Perpanjangan Sertifikat Kepri — 475.360 m²', amount: 1_320_000_000 },
  { name: 'Penerbitan Sertifikat a.n. PT Timah Tbk — Wilayah Bekasi', amount: 2_550_000_000 },
]

export const CAPEX_TOTAL = CAPEX_ITEMS.reduce((s, i) => s + i.amount, 0) // 35.070.000.000
