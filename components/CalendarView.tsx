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
  berjalan: '#2563eb',
  melewati_target: '#dc2626',
  tepat_waktu: '#059669',
  terlambat: '#d97706',
}

const STATUS_LABELS: Record<string, string> = {
  berjalan: 'Berjalan',
  melewati_target: 'Melewati Target',
  tepat_waktu: 'Selesai Tepat Waktu',
  terlambat: 'Selesai Terlambat',
}

// Logika status sama dengan halaman Monitor Progress
function getStatus(item: ProgressItem): keyof typeof STATUS_COLORS {
  const today = new Date().toLocaleDateString('sv-SE')
  if (item.status === 'done') {
    const doneDate = item.completed_at
      ? new Date(item.completed_at).toLocaleDateString('sv-SE')
      : today
    return doneDate <= item.target_date ? 'tepat_waktu' : 'terlambat'
  }
  return item.target_date < today ? 'melewati_target' : 'berjalan'
}

interface CalEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: ProgressItem
}

export function CalendarView({ items }: { items: ProgressItem[] }) {
  const [date, setDate] = useState(new Date())
  const [view, setView] = useState<View>('month')
  const router = useRouter()

  const events: CalEvent[] = items.map((item) => {
    const [y, m, d] = item.target_date.split('-').map(Number)
    const day = new Date(y, m - 1, d)
    return {
      id: item.id,
      title: item.pic?.full_name ? `${item.title} — ${item.pic.full_name}` : item.title,
      start: day,
      end: day,
      resource: item,
    }
  })

  const eventStyleGetter = useCallback((event: CalEvent) => ({
    style: {
      backgroundColor: STATUS_COLORS[getStatus(event.resource)],
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
