import { BookOpen, ClipboardList, Layers, ListChecks, CheckSquare } from 'lucide-react'

// Halaman statis — panduan alur input untuk seluruh personil.
// Aturan main ditetapkan Kadiv 22 Jul 2026: dashboard = pekerjaan utama saja.

const CONTOH: { input: string; tujuan: string; catatan: string }[] = [
  {
    input: 'Menangani perkara No. 123/PDT.G/2026',
    tujuan: 'Kegiatan baru',
    catatan: 'Pekerjaan utama — tampil di board departemen.',
  },
  {
    input: 'Menyiapkan berkas banding perkara 123',
    tujuan: 'Tab Pekerjaan',
    catatan: 'Langkah dari pekerjaan utama — buka kegiatan perkaranya, isi di tab Pekerjaan.',
  },
  {
    input: 'Hari ini hadir sidang perkara 123 di PN',
    tujuan: 'Log Harian',
    catatan: 'Catatan kerja hari ini — pilih kegiatan perkara 123 di dropdown.',
  },
  {
    input: 'Pendampingan pengecekan barang di gudang (rutin)',
    tujuan: 'Log Harian',
    catatan: 'Pilih kegiatan payung rutinnya (mis. "Pendampingan Operasional — 2026"). Kalau payungnya belum ada, dept head membuatnya sekali untuk setahun.',
  },
  {
    input: 'Rapat internal / tugas umum lainnya',
    tujuan: 'Log Harian',
    catatan: 'Pilih "Umum — tidak terkait kegiatan".',
  },
]

const TINGKAT = [
  {
    icon: Layers,
    warna: '#6d4fc4',
    bg: '#f3ebfb',
    judul: '1. Kegiatan — hanya PEKERJAAN UTAMA',
    isi: 'Yang tampil di dashboard Kadiv hanyalah pekerjaan besar: perkara, proyek, program, atau kontrak yang berjalan berminggu-minggu. Rapat dan langkah kecil TIDAK dibuat sebagai kegiatan baru. Pekerjaan rutin yang berulang sepanjang tahun dibuatkan satu "kegiatan payung" tahunan oleh dept head.',
  },
  {
    icon: ListChecks,
    warna: '#2458a6',
    bg: '#e9f1fb',
    judul: '2. Tab Pekerjaan — langkah/breakdown',
    isi: 'Di dalam setiap kegiatan ada tab "Pekerjaan". Isi langkah-langkah untuk menyelesaikan pekerjaan utama beserta target tanggalnya. Checklist inilah yang menjadi angka % Progress di dashboard dan masuk panel "Perlu Perhatian" Kadiv jika terlambat.',
  },
  {
    icon: ClipboardList,
    warna: '#1e7a56',
    bg: '#e9f5ef',
    judul: '3. Log Harian — bukti kerja harian Anda',
    isi: 'Setiap hari, catat apa yang Anda kerjakan: SATU catatan untuk TIAP kegiatan yang dikerjakan hari itu, pilih kegiatannya di dropdown "Kegiatan utama terkait". Catatan Anda tampil di Monitor Tim dan terkumpul di tab "Log" kegiatan tersebut — inilah yang dilihat pimpinan sebagai rekam jejak kerja harian Anda.',
  },
  {
    icon: CheckSquare,
    warna: '#a05c0a',
    bg: '#fdf3e3',
    judul: 'Monitor Progress — penugasan dari Kadiv',
    isi: 'Terpisah dari alur di atas: pekerjaan yang ditugaskan langsung oleh Kadiv dengan target tanggal. Kerjakan lalu tandai selesai dengan centang — untuk kerja tim, satu centang berlaku untuk semua anggota.',
  },
]

export default function PanduanPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--navy-900)' }}>
          <BookOpen size={18} className="text-white" />
        </div>
        <div>
          <h1 className="font-serif leading-tight" style={{ fontSize: '26px', color: 'var(--navy-900)' }}>
            Panduan Pengisian
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Alur input Monitor Giat — supaya dashboard rapi dan kerja Anda terlihat
          </p>
        </div>
      </div>

      {/* Prinsip utama */}
      <div className="rounded-xl px-4 py-3.5" style={{ background: 'var(--warn-bg)', borderLeft: '3px solid var(--warn)' }}>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          <b>Prinsip utama:</b> dashboard hanya untuk <b>pekerjaan utama</b>. Pekerjaan
          detail/harian dicatat <b>di dalam</b> pekerjaan utama tersebut — lewat tab
          Pekerjaan (langkah) dan Log Harian (catatan kerja per hari).
        </p>
      </div>

      {/* 3 tingkat + monitor progress */}
      <div className="space-y-3">
        {TINGKAT.map((t) => {
          const Icon = t.icon
          return (
            <div
              key={t.judul}
              className="bg-white rounded-2xl p-4 flex items-start gap-3"
              style={{ border: '1px solid var(--cream-border)', boxShadow: '0 1px 4px rgba(11,25,41,0.04)' }}
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: t.bg }}>
                <Icon size={15} style={{ color: t.warna }} />
              </span>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t.judul}</p>
                <p className="text-sm leading-relaxed mt-1" style={{ color: 'var(--text-secondary)' }}>{t.isi}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Contoh: masuk ke mana */}
      <div
        className="bg-white rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--cream-border)', boxShadow: '0 1px 4px rgba(11,25,41,0.04)' }}
      >
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--separator)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Contoh: input saya masuk ke mana?</p>
        </div>
        <div className="divide-y divide-[--cream-border]">
          {CONTOH.map((c) => (
            <div key={c.input} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                  &ldquo;{c.input}&rdquo;
                </p>
                <span
                  className="shrink-0 text-[10.5px] font-bold px-2 py-0.5 rounded-full tracking-wide"
                  style={
                    c.tujuan === 'Kegiatan baru'
                      ? { background: '#f3ebfb', color: '#6d4fc4' }
                      : c.tujuan === 'Tab Pekerjaan'
                        ? { background: '#e9f1fb', color: '#2458a6' }
                        : { background: '#e9f5ef', color: '#1e7a56' }
                  }
                >
                  {c.tujuan}
                </span>
              </div>
              <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--text-muted)' }}>{c.catatan}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Uji cepat */}
      <div className="rounded-xl px-4 py-3.5" style={{ background: 'var(--cream-dark)', border: '1px solid var(--cream-border)' }}>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <b style={{ color: 'var(--text-primary)' }}>Uji cepat sebelum klik &ldquo;Tambah Kegiatan&rdquo;:</b>{' '}
          apakah ini pekerjaan yang hidup berminggu-minggu dan perlu dipantau Kadiv di
          dashboard? Kalau <b>bukan</b>, tempatnya di tab Pekerjaan kegiatan induk atau di
          Log Harian.
        </p>
      </div>
    </div>
  )
}
