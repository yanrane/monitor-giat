'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { toggleTaskStatus } from './task-toggle-action'

interface TaskToggleButtonProps {
  taskId: string
  activityId: string
  status: string
}

export function TaskToggleButton({ taskId, activityId, status }: TaskToggleButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    await toggleTaskStatus(taskId, activityId, status)
    setLoading(false)
  }

  if (loading) return <Loader2 size={18} className="animate-spin shrink-0" style={{ color: '#3b82f6' }} />

  return (
    <button onClick={handleToggle} className="shrink-0 transition-opacity hover:opacity-70">
      {status === 'done'
        ? <CheckCircle2 size={18} style={{ color: '#10b981' }} />
        : <Circle size={18} style={{ color: '#9ca3af' }} />}
    </button>
  )
}
