'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { CheckCheck } from 'lucide-react'
import { toast } from 'sonner'

export function MarkAllReadButton({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function markAll() {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    toast.success('Semua notifikasi ditandai telah dibaca')
    router.refresh()
  }

  return (
    <Button variant="outline" size="sm" onClick={markAll}>
      <CheckCheck size={14} className="mr-1.5" />
      Tandai Semua Dibaca
    </Button>
  )
}
