'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ponytail: polling 45s + refresh saat tab kembali aktif; upgrade ke
// Supabase Realtime kalau butuh update instan tanpa jeda.
export function AutoRefresh({ intervalMs = 45000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const refreshIfVisible = () => {
      if (!document.hidden) router.refresh()
    }
    window.addEventListener('focus', refreshIfVisible)
    document.addEventListener('visibilitychange', refreshIfVisible)
    const timer = setInterval(refreshIfVisible, intervalMs)
    return () => {
      window.removeEventListener('focus', refreshIfVisible)
      document.removeEventListener('visibilitychange', refreshIfVisible)
      clearInterval(timer)
    }
  }, [router, intervalMs])

  return null
}
