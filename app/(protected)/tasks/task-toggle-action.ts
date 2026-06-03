'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function toggleTaskStatus(taskId: string, activityId: string, currentStatus: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'kadiv') return { error: 'Kadiv tidak dapat mengubah status pekerjaan' }

  const newStatus = currentStatus === 'done' ? 'pending' : 'done'
  const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
  if (error) return { error: error.message }

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  revalidatePath(`/activities/${activityId}`)
  return { success: true }
}
