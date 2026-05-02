'use client'

import { useState, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { type Activity, DEPT_BG_COLORS } from '@/lib/types'
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

interface CalEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: Activity
}

export function CalendarView({ activities }: { activities: Activity[] }) {
  const [date, setDate] = useState(new Date())
  const [view, setView] = useState<View>('month')
  const router = useRouter()

  const events: CalEvent[] = activities.map((a) => ({
    id: a.id,
    title: a.title,
    start: new Date(a.start_date),
    end: new Date(a.end_date),
    resource: a,
  }))

  const eventStyleGetter = useCallback((event: CalEvent) => {
    const deptName = event.resource.departments?.name ?? ''
    const bg = DEPT_BG_COLORS[deptName] ?? '#64748b'
    return {
      style: {
        backgroundColor: bg,
        borderRadius: '4px',
        color: 'white',
        border: 'none',
        fontSize: '12px',
        padding: '1px 4px',
      },
    }
  }, [])

  const handleSelectEvent = useCallback((event: CalEvent) => {
    router.push(`/activities/${event.id}`)
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
            noEventsInRange: 'Tidak ada kegiatan pada rentang ini',
            showMore: (total) => `+${total} lagi`,
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 px-2 pt-2 border-t">
        {Object.entries(DEPT_BG_COLORS).map(([name, color]) => (
          <div key={name} className="flex items-center gap-1.5 text-xs">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
            {name}
          </div>
        ))}
      </div>
    </div>
  )
}
