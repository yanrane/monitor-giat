'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { resetUserPassword } from './actions'

export function ResetPasswordButton({ userId, name }: { userId: string; name: string }) {
  const [loading, setLoading] = useState(false)

  async function handle() {
    if (!confirm(`Kirim email reset password ke ${name}?`)) return
    setLoading(true)
    const result = await resetUserPassword(userId)
    if (result.error) {
      toast.error(`Gagal: ${result.error}`)
    } else {
      toast.success(`Email reset password terkirim ke ${name}`)
    }
    setLoading(false)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="shrink-0"
      onClick={handle}
      disabled={loading}
      title="Reset Password"
    >
      <KeyRound size={14} />
    </Button>
  )
}
