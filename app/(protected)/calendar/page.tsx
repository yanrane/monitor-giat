import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { type ProgressItem } from '@/lib/types'
import { CalendarView } from '@/components/CalendarView'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: items } = await supabase
    .from('progress_items')
    .select('*, pic:profiles!progress_items_pic_id_fkey(id, full_name)')
    .order('target_date')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Kalender Monitor Progress</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Target selesai pekerjaan dari Monitor Progress
        </p>
      </div>
      <CalendarView items={items as ProgressItem[] ?? []} />
    </div>
  )
}
