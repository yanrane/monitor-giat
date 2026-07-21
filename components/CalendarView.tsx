'use client'

import { useState, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { type ProgressItem } from '@/lib/types'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { id: idLocale },
})

// Warna mengikuti kartu ringkasan Monitor Progress
const STATUS_COLORS: Record<string, string> = {
  berjalan: '#2458a6',
  melewati_target: '#b3362a',
  tepat_waktu: '#1e7a56',
  terlambat: '#a05c0a',
}

const STATUS_LABELS: Record<string, string> = {
  berjalan: 'Berjalan',
  melewati_target: 'Melewati Target',
  tepat_waktu: 'Selesai Tepat Waktu',
  terlambat: 'Selesai Terlambat',
}

// Logika status gabungan sama dengan halaman Monitor Progress
// (multi-PIC = kerja tim, satu pekerjaan satu status)
function getGroupStatus(members: ProgressItem[]): keyof typeof STATUS_COLORS {
  const today = new Date().toLocaleDateString('sv-SE')
  const target = members[0].target_date
  if (members.some((m) => m.status !== 'done')) {
    return target < today ? 'melewati_target' : 'berjalan'
  }
  const late = members.some((m) => {
    const doneDate = m.completed_at ? new Date(m.completed_at).toLocaleDateString('sv-SE') : today
    return doneDate > target
  })
  return late ? 'terlambat' : 'tepat_waktu'
}

interface CalEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: ProgressItem[]
}

export function CalendarView({ items }: { items: ProgressItem[] }) {
  const [date, setDate] = useState(new Date())
  const [view, setView] = useState<View>('month')
  const router = useRouter()

  // Gabung baris multi-PIC jadi satu event per pekerjaan
  const groups = new Map<string, ProgressItem[]>()
  for (const item of items) {
    const key = `${item.title}|${item.target_date}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  const events: CalEvent[] = [...groups.values()].map((members) => {
    const [y, m, d] = members[0].target_date.split('-').map(Number)
    const day = new Date(y, m - 1, d)
    const names = members.map((m) => m.pic?.full_name).filter(Boolean).join(', ')
    return {
      id: members[0].id,
      title: names ? `${members[0].title} — ${names}` : members[0].title,
      start: day,
      end: day,
      resource: members,
    }
  })

  const eventStyleGetter = useCallback((event: CalEvent) => ({
    style: {
      backgroundColor: STATUS_COLORS[getGroupStatus(event.resource)],
      borderRadius: '4px',
      color: 'white',
      border: 'none',
      fontSize: '12px',
      padding: '1px 4px',
    },
  }), [])

  const handleSelectEvent = useCallback(() => {
    router.push('/progress')
  }, [router])

  return (
    <div className="bg-white rounded-lg border p-2">
      {/* Custom toolbar */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => setDate((d) => {
            const nd = new Date(d)
            nd.setMonth(nd.getMonth() - 1)
            return nd
          })}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setDate((d) => {
            const nd = new Date(d)
            nd.setMonth(nd.getMonth() + 1)
            return nd
          })}>
            <ChevronRight size={16} />
          </Button>
        </div>
        <h2 className="font-semibold text-sm">
          {format(date, 'MMMM yyyy', { locale: idLocale })}
        </h2>
        <div className="flex gap-1">
          {(['month', 'week', 'agenda'] as View[]).map((v) => (
            <Button
              key={v}
              variant={view === v ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView(v)}
              className="text-xs capitalize"
            >
              {v === 'month' ? 'Bulan' : v === 'week' ? 'Minggu' : 'Agenda'}
            </Button>
          ))}
        </div>
      </div>

      <div style={{ height: 520 }}>
        <Calendar
          localizer={localizer}
          events={events}
          date={date}
          view={view}
          onNavigate={setDate}
          onView={setView}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          toolbar={false}
          culture="id"
          messages={{
            noEventsInRange: 'Tidak ada target pekerjaan pada rentang ini',
            showMore: (total) => `+${total} lagi`,
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 px-2 pt-2 border-t">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: STATUS_COLORS[key] }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
