'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addAdminExpense(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles').select('role, dept_id').eq('id', user.id).single()

  if (!profile || profile.role === 'kadiv') {
    return { error: 'Hanya dept head dan staf yang dapat menginput pengeluaran' }
  }

  const category       = formData.get('category') as string
  const budget_type    = formData.get('budget_type') === 'capex' ? 'capex' : 'opex'
  const description    = formData.get('description') as string
  const amountRaw      = formData.get('amount') as string
  const expense_date   = formData.get('expense_date') as string
  const recipient_name = formData.get('recipient_name') as string | null

  if (!category || !description?.trim() || !amountRaw || !expense_date) {
    return { error: 'Semua field wajib diisi' }
  }

  const amount = parseInt(amountRaw.replace(/\D/g, ''), 10)
  if (isNaN(amount) || amount < 0) return { error: 'Jumlah tidak valid' }

  const { error } = await supabase.from('expenses').insert({
    category,
    budget_type,
    description:    description.trim(),
    amount,
    expense_date,
    recipient_name: recipient_name?.trim() || null,
    created_by:     user.id,
    dept_id:        profile.dept_id,
  })

  if (error) return { error: error.message }
  revalidatePath('/administrasi')
  revalidatePath('/expenses')
  return { success: true }
}

export async function deleteAdminExpense(expenseId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
  if (error) return { error: error.message }

  revalidatePath('/administrasi')
  revalidatePath('/expenses')
  return { success: true }
}
