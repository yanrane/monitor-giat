'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// RLS app_settings: insert/update hanya kadiv.
export async function setBudget(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const digits = String(formData.get('pagu') ?? '').replace(/\D/g, '')
  if (!digits) return

  await supabase.from('app_settings').upsert({
    key: 'budget_pagu',
    value: digits,
    updated_at: new Date().toISOString(),
  })
  revalidatePath('/expenses')
}
