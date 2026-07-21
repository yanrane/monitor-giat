'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  type ControlStatus,
  type DecisionAction,
  DECISION_ACTION_LABELS,
  DECISION_RESULT_STATUSES,
} from '@/lib/types'

interface DecisionInput {
  action: DecisionAction
  instruction: string
  resulting_control_status: ControlStatus
  next_action?: string | null
  next_action_due_date?: string | null
}

// Menjalankan RPC apply_kadiv_decision (SECURITY DEFINER) dengan sesi
// user sendiri — otorisasi kadiv & append-only ditegakkan di database.
export async function applyKadivDecision(activityId: string, input: DecisionInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  if (!(input.action in DECISION_ACTION_LABELS)) return { error: 'Aksi keputusan tidak valid' }
  if (!input.instruction?.trim()) return { error: 'Instruksi/keputusan wajib diisi' }
  if (!DECISION_RESULT_STATUSES.includes(input.resulting_control_status)) {
    return { error: 'Status kendali hasil tidak valid' }
  }

  const { error } = await supabase.rpc('apply_kadiv_decision', {
    p_activity_id: activityId,
    p_action: input.action,
    p_instruction: input.instruction.trim(),
    p_resulting_control_status: input.resulting_control_status,
    p_next_action: input.next_action?.trim() || null,
    p_next_action_due_date: input.next_action_due_date || null,
  })

  if (error) return { error: error.message }

  revalidatePath(`/activities/${activityId}`)
  revalidatePath('/dashboard')
  return { success: true }
}
