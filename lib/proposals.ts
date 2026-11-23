// Validasi payload usulan dari bot (POST /api/bot/proposals) — batas kepercayaan.
// Hanya mengimpor zod agar bisa diuji langsung dengan node (scripts/check-usulan.mjs).
import { z } from 'zod'

export interface ProposalInput {
  teo_ref: string
  teo_tanggal: string | null
  perihal: string
  instruksi: string | null
  judul: string
  pic_ids: string[]
  target_date: string
  alasan_tenggat: string | null
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

// Tanggal kalender nyata (bukan 2026-13-01) dalam rentang yang aman untuk Postgres
export function isIsoDate(s: string): boolean {
  if (!DATE.test(s)) return false
  const year = Number(s.slice(0, 4))
  if (year < 1900 || year > 2100) return false
  const t = Date.parse(`${s}T00:00:00Z`) // NaN untuk bulan/hari mustahil; jangan toISOString() pada NaN
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s
}

// Postgres menolak karakter NUL di kolom text → tolak di sini supaya jadi 400, bukan 500
const noNul = (s: string) => !s.includes('\u0000')
const NUL_MSG = 'karakter tidak valid'
const requiredText = (max: number) =>
  z.string().trim().min(1, 'wajib diisi').max(max, `maksimal ${max} karakter`).refine(noNul, NUL_MSG)
const optionalText = (max: number) =>
  z.string().trim().max(max, `maksimal ${max} karakter`).refine(noNul, NUL_MSG).nullish().transform((v) => v || null)

// teo_ref dinormalisasi (spasi dirapikan, huruf besar): "nd  123/2026" dan "ND 123/2026" = usulan yang sama
const teoRef = requiredText(100).transform((s) => s.replace(/\s+/g, ' ').toUpperCase())

// Dibaca sebelum validasi penuh: usulan yang sudah ada dijawab apa adanya (spec §6.2),
// walau isi kiriman ulang kini tak lagi valid (tenggat lewat, PIC nonaktif).
export function parseTeoRef(body: unknown): string | null {
  const parsed = teoRef.safeParse((body as { teo_ref?: unknown } | null)?.teo_ref)
  return parsed.success ? parsed.data : null
}

const schema = z.object({
  teo_ref: teoRef,
  // "" = kosong, sama seperti field opsional lain
  teo_tanggal: z.string().refine((s) => s === '' || isIsoDate(s), 'format YYYY-MM-DD')
    .nullish().transform((v) => v || null),
  perihal: requiredText(300),
  instruksi: optionalText(1000),
  judul: requiredText(200),
  pic_ids: z.array(z.uuid('bukan UUID')).min(1, 'minimal 1 PIC'),
  target_date: z.string().refine(isIsoDate, 'format YYYY-MM-DD'),
  alasan_tenggat: optionalText(300),
})

const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)

export function parseProposalInput(
  body: unknown,
  ctx: { today: string; activePicIds: Set<string> }
): { ok: true; value: ProposalInput } | { ok: false; errors: string[] } {
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`) }
  }

  const value = { ...parsed.data, pic_ids: [...new Set(parsed.data.pic_ids)] }
  const errors: string[] = []
  if (value.target_date < ctx.today) errors.push('target_date: tidak boleh sebelum hari ini')
  if (value.target_date > addDays(ctx.today, 365)) errors.push('target_date: maksimal 365 hari ke depan')
  const unknown = value.pic_ids.filter((id) => !ctx.activePicIds.has(id))
  if (unknown.length) errors.push(`pic_ids: bukan profil aktif non-Kadiv: ${unknown.join(', ')}`)

  return errors.length ? { ok: false, errors } : { ok: true, value }
}
