'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// RLS di tabel progress_items yang menegakkan izin:
// insert/delete = kadiv, update = kadiv atau PIC.

export async function addProgressItem(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const title = String(formData.get('title') ?? '').trim()
  const picId = String(formData.get('pic_id') ?? '')
  const targetDate = String(formData.get('target_date') ?? '')
  if (!title || !picId || !targetDate) return

  await supabase.from('progress_items').insert({
    title,
    pic_id: picId,
    target_date: targetDate,
    created_by: user.id,
  })
  revalidatePath('/progress')
}

export async function toggleProgressItem(id: string, currentStatus: string) {
  const supabase = await createClient()
  const done = currentStatus !== 'done'
  await supabase.from('progress_items').update({
    status: done ? 'done' : 'pending',
    completed_at: done ? new Date().toISOString() : null,
  }).eq('id', id)
  revalidatePath('/progress')
}

export async function deleteProgressItem(id: string) {
  const supabase = await createClient()
  await supabase.from('progress_items').delete().eq('id', id)
  revalidatePath('/progress')
}
