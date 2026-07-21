// Skeleton global untuk semua halaman protected — bentuk mengikuti pola umum:
// judul + subjudul, strip ringkasan, lalu dua panel
export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Memuat halaman">
      <div>
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-4 w-96 mt-2 max-w-full" />
      </div>
      <div className="skeleton h-24 w-full rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
      <div className="skeleton h-64 w-full rounded-2xl" />
    </div>
  )
}
