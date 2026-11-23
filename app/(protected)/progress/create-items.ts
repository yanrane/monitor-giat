// Helper server (sengaja BUKAN 'use server' — tidak boleh jadi endpoint publik).
// Dipakai form Monitor Progress (addProgressItem) dan persetujuan usulan (approveProposal).
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'

export async function createProgressItems(
  supabase: SupabaseClient,
  input: { title: string; picIds: string[]; targetDate: string; createdBy: string; proposalId?: string }
): Promise<{ error: string | null }> {
  // Multi-PIC = satu baris per orang, biar ketepatan waktu terukur per PIC
  const { error } = await supabase.from('progress_items').insert(
    input.picIds.map((picId) => ({
      title: input.title,
      pic_id: picId,
      target_date: input.targetDate,
      created_by: input.createdBy,
      ...(input.proposalId ? { proposal_id: input.proposalId } : {}),
    }))
  )
  if (error) return { error: error.message }
  await notifyNewItems(input)
  return { error: null }
}

// Notifikasi lonceng ke tiap PIC (insert notifications hanya bisa via service_role).
// Gagal notif tidak boleh menggagalkan penambahan item.
export async function notifyNewItems(input: { title: string; picIds: string[]; targetDate: string }) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await createAdminClient().from('notifications').insert(
      input.picIds.map((picId) => ({
        user_id: picId,
        title: 'Tugas baru dari Kepala Divisi',
        message: `Anda ditugaskan: ${input.title} — target selesai ${formatDate(input.targetDate)}. Cek menu Monitor Progress.`,
        type: 'status_change',
      }))
    )
  }
  return { error: null }
}
