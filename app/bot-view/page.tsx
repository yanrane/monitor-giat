import type { Metadata } from 'next'
import {
  authorizeBotToken,
  buildBotSummary,
  recordBotAccess,
  STALE_CRITICAL_DAYS,
  STALE_WARNING_DAYS,
} from '@/lib/bot-access'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Monitor Giat — Tampilan Bot (read-only)',
  robots: { index: false, follow: false },
}

/**
 * Tampilan read-only untuk bot.
 *   /bot-view?token=<token bot>
 *
 * Tidak butuh login dan tidak memakai cookie/sesi, sehingga beberapa bot
 * bisa membuka halaman ini bersamaan tanpa saling menendang sesi --
 * masalah utama kalau banyak bot memakai satu browser yang sama.
 */

const STATUS_LABEL: Record<string, string> = {
  belum_mulai: 'Belum mulai',
  berjalan: 'Berjalan',
  selesai: 'Selesai',
  ditunda: 'Ditunda',
}

const KENDALI_LABEL: Record<string, string> = {
  on_track: 'On track',
  waiting_internal: 'Menunggu internal',
  waiting_external: 'Menunggu eksternal',
  needs_kadiv_decision: 'Butuh keputusan Kadiv',
  blocked: 'Terhambat',
  escalated: 'Eskalasi',
}

export default async function BotViewPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token: raw } = await searchParams

  if (!raw) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-slate-100">Token bot tidak ada</h1>
        <p className="mt-2 text-slate-300">
          Buka halaman ini dengan <code className="rounded bg-slate-800 px-1">?token=&lt;token bot&gt;</code>.
        </p>
      </Shell>
    )
  }

  const auth = await authorizeBotToken(
    new Request(`https://monitor-giat.vercel.app/bot-view?token=${encodeURIComponent(raw)}`)
  )

  if (auth.error || !auth.token) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-rose-300">Akses ditolak</h1>
        <p className="mt-2 text-slate-300">{auth.error}</p>
      </Shell>
    )
  }

  const summary = await buildBotSummary(auth.token)
  await recordBotAccess(auth.token.id, '/bot-view', 'html')

  return (
    <Shell>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">Ringkasan Progres Monitor Giat</h1>
          <p className="mt-1 text-sm text-slate-400">
            {summary.tanggal_wib} (WIB) · Cakupan: {summary.bot.cakupan} · Bot: {summary.bot.label}
          </p>
        </div>
        <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-slate-200">
          Read-only
        </span>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Kegiatan terbuka" value={summary.ringkasan.aktivitas_terbuka} />
        <Stat label="Butuh keputusan Kadiv" value={summary.ringkasan.butuh_keputusan_kadiv} tone="purple" />
        <Stat label="Terhambat / eskalasi" value={summary.ringkasan.terhambat} tone="rose" />
        <Stat label="Progres terlambat" value={summary.ringkasan.progres_terlambat} tone="rose" />
        <Stat label="Log hari ini ✔" value={summary.ringkasan.log_hari_ini_sudah} tone="emerald" />
        <Stat label="Log hari ini ✗" value={summary.ringkasan.log_hari_ini_belum} tone="amber" />
      </section>

      {summary.bidang.map((b) => {
        const aktif = Object.entries(b.aktivitas).filter(([k]) => k !== 'selesai')
        return (
          <section key={b.nama} className="mt-8 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <h2 className="text-lg font-semibold text-slate-100">{b.nama}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {aktif.length
                ? aktif.map(([k, v]) => `${STATUS_LABEL[k] ?? k}: ${v}`).join(' · ')
                : 'Tidak ada kegiatan aktif'}
              {b.prioritas_p1 > 0 ? ` · P1: ${b.prioritas_p1}` : ''}
            </p>

            {b.butuh_perhatian.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-300">
                  Perlu perhatian
                </h3>
                <ul className="mt-2 space-y-2">
                  {b.butuh_perhatian.slice(0, 10).map((a, i) => (
                    <li key={`${b.nama}-${i}`} className="rounded-lg bg-slate-900/50 p-3">
                      <p className="font-medium text-slate-100">{a.judul}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {[
                          a.pic ? `PIC: ${a.pic}` : null,
                          STATUS_LABEL[a.status] ?? a.status,
                          a.prioritas ? a.prioritas.toUpperCase() : null,
                          a.status_kendali ? (KENDALI_LABEL[a.status_kendali] ?? a.status_kendali) : null,
                          a.hari_tanpa_update !== null ? `${a.hari_tanpa_update} hari tanpa update` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {a.next_action && (
                        <p className="mt-1 text-sm text-sky-200">
                          → {a.next_action}
                          {a.tenggat_next_action ? ` (tenggat ${a.tenggat_next_action})` : ''}
                        </p>
                      )}
                      {a.blocker && <p className="mt-1 text-sm text-rose-300">⛔ {a.blocker}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {b.progres_terlambat.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-rose-300">
                  Progres terlambat
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-200">
                  {b.progres_terlambat.slice(0, 10).map((p, i) => (
                    <li key={`${b.nama}-p-${i}`}>
                      • {p.judul} — PIC {p.pic}, target {p.target} ({p.hari_terlambat} hari)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )
      })}

      <section className="mt-8 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Log harian hari ini</h2>
        <p className="mt-2 text-sm text-emerald-300">
          Sudah mengisi: {summary.personel.sudah_log_hari_ini.length || 'belum ada'}
        </p>
        <p className="mt-1 text-sm text-amber-300">
          Belum mengisi:{' '}
          {summary.personel.belum_log_hari_ini.length ? summary.personel.belum_log_hari_ini.join(', ') : 'semua sudah ✔'}
        </p>
      </section>

      <footer className="mt-6 text-xs leading-relaxed text-slate-500">
        <p>
          Ambang stale: peringatan ≥{STALE_WARNING_DAYS} hari, kritis ≥{STALE_CRITICAL_DAYS} hari. Angka{' '}
          &quot;hari tanpa update&quot; berarti rekor di aplikasi belum diperbarui — bukan bukti PIC tidak bekerja.
        </p>
        <p className="mt-1">
          Halaman ini hanya menampilkan data. Bot tidak dapat mengubah kegiatan, log, atau keputusan lewat jalur ini.
        </p>
      </footer>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-900 px-4 py-8 text-slate-200 sm:px-8">
      <div className="mx-auto max-w-5xl">{children}</div>
    </main>
  )
}

function Stat({
  label,
  value,
  tone = 'slate',
}: {
  label: string
  value: number
  tone?: 'slate' | 'rose' | 'amber' | 'emerald' | 'purple'
}) {
  const tones: Record<string, string> = {
    slate: 'text-slate-100',
    rose: 'text-rose-300',
    amber: 'text-amber-300',
    emerald: 'text-emerald-300',
    purple: 'text-purple-300',
  }
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3">
      <p className={`text-2xl font-semibold ${tones[tone]}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  )
}
