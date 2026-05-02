import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { type Activity } from '@/lib/types'
import { CalendarView } from '@/components/CalendarView'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, dept_id').eq('id', user.id).single()

  let query = supabase.from('activities').select('*, departments(name)')
  if (profile?.role !== 'kadiv' && profile?.dept_id) {
    query = query.eq('dept_id', profile.dept_id)
  }

  const { data: activities } = await query.order('start_date')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Kalender Kegiatan</h1>
      <CalendarView activities={activities as Activity[] ?? []} />
    </div>
  )
}
