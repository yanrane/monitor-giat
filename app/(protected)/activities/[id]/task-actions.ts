'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addTask(activityId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const title    = formData.get('title') as string
  const due_date = formData.get('due_date') as string | null

  if (!title?.trim()) return { error: 'Nama pekerjaan wajib diisi' }

  const { error } = await supabase.from('tasks').insert({
    activity_id: activityId,
    title:       title.trim(),
    due_date:    due_date || null,
    status:      'pending',
    created_by:  user.id,
  })

  if (error) return { error: error.message }
  revalidatePath(`/activities/${activityId}`)
  return { success: true }
}

export async function toggleTask(taskId: string, activityId: string, currentStatus: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const newStatus = currentStatus === 'done' ? 'pending' : 'done'

  const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
  if (error) return { error: error.message }

  revalidatePath(`/activities/${activityId}`)
  return { success: true }
}

export async function deleteTask(taskId: string, activityId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) return { error: error.message }

  revalidatePath(`/activities/${activityId}`)
  return { success: true }
}
