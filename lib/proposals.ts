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
const isRealDate = (s: string) => {
  if (!DATE.test(s)) return false
  const t = Date.parse(`${s}T00:00:00Z`) // NaN untuk bulan/hari mustahil; jangan toISOString() pada NaN
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s
}
const optionalText = (max: number) =>
  z.string().trim().max(max, `maksimal ${max} karakter`).nullish().transform((v) => v || null)

const schema = z.object({
  teo_ref: z.string().trim().min(1, 'wajib diisi').max(100, 'maksimal 100 karakter'),
  teo_tanggal: z.string().refine(isRealDate, 'format YYYY-MM-DD').nullish().transform((v) => v ?? null),
  perihal: z.string().trim().min(1, 'wajib diisi').max(300, 'maksimal 300 karakter'),
  instruksi: optionalText(1000),
  judul: z.string().trim().min(1, 'wajib diisi').max(200, 'maksimal 200 karakter'),
  pic_ids: z.array(z.uuid('bukan UUID')).min(1, 'minimal 1 PIC'),
  target_date: z.string().refine(isRealDate, 'format YYYY-MM-DD'),
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
