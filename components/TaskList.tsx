'use client'

import { useState, useRef } from 'react'
import { CheckCircle2, Circle, Trash2, Plus, CalendarDays, Loader2 } from 'lucide-react'
import { type Task, type Profile } from '@/lib/types'
import { addTask, toggleTask, deleteTask } from '@/app/(protected)/activities/[id]/task-actions'
import { formatDate } from '@/lib/utils'

interface TaskListProps {
  activityId: string
  tasks: Task[]
  currentUser: Profile
}

export function TaskList({ activityId, tasks, currentUser }: TaskListProps) {
  const [adding, setAdding]     = useState(false)
  const [loading, setLoading]   = useState<string | null>(null)
  const formRef                 = useRef<HTMLFormElement>(null)
  const canEdit                 = currentUser.role !== 'kadiv'

  const done  = tasks.filter((t) => t.status === 'done').length
  const total = tasks.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  async function handleToggle(task: Task) {
    setLoading(task.id)
    await toggleTask(task.id, activityId, task.status)
    setLoading(null)
  }

  async function handleDelete(task: Task) {
    if (!confirm(`Hapus pekerjaan "${task.title}"?`)) return
    setLoading('del-' + task.id)
    await deleteTask(task.id, activityId)
    setLoading(null)
  }

  async function handleAdd(formData: FormData) {
    setLoading('add')
    const result = await addTask(activityId, formData)
    setLoading(null)
    if (!result?.error) {
      formRef.current?.reset()
      setAdding(false)
    }
  }

  return (
    <div
      className="bg-white rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--cream-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--cream-border)' }}>
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Daftar Pekerjaan
          </p>
          {total > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#e9f5ef', color: '#1e7a56' }}>
              {done}/{total} selesai
            </span>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}
          >
            <Plus size={13} />
            Tambah
          </button>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--cream-border)', background: 'var(--surface)' }}>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--cream-dark)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: pct === 100 ? '#1e7a56' : '#2458a6' }}
              />
            </div>
            <span className="text-xs font-bold w-10 text-right" style={{ color: pct === 100 ? '#1e7a56' : 'var(--text-muted)' }}>
              {pct}%
            </span>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="divide-y divide-[--cream-border]">
        {tasks.length === 0 && !adding && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Belum ada pekerjaan. {canEdit ? 'Klik "Tambah" untuk mulai.' : ''}
            </p>
          </div>
        )}

        {tasks.map((task) => {
          const isDone    = task.status === 'done'
          const isLoading = loading === task.id || loading === 'del-' + task.id

          return (
            <div
              key={task.id}
              className="flex items-start gap-3 px-4 py-3 group transition-colors"
              style={{ background: isDone ? '#e9f5ef' : 'white' }}
            >
              {/* Toggle button */}
              {canEdit ? (
                <button
                  onClick={() => handleToggle(task)}
                  disabled={isLoading}
                  className="mt-0.5 shrink-0 transition-colors hover:opacity-70"
                >
                  {isLoading && loading === task.id ? (
                    <Loader2 size={18} className="animate-spin" style={{ color: '#2458a6' }} />
                  ) : isDone ? (
                    <CheckCircle2 size={18} style={{ color: '#1e7a56' }} />
                  ) : (
                    <Circle size={18} style={{ color: '#9ca3af' }} />
                  )}
                </button>
              ) : (
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 size={18} style={{ color: '#1e7a56' }} />
                  ) : (
                    <Circle size={18} style={{ color: '#9ca3af' }} />
                  )}
                </div>
              )}

              {/* Task content */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm"
                  style={{
                    color: isDone ? '#6b7280' : 'var(--text-primary)',
                    textDecoration: isDone ? 'line-through' : 'none',
                  }}
                >
                  {task.title}
                </p>
                {task.due_date && (
                  <div className="flex items-center gap-1 mt-1">
                    <CalendarDays size={11} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Target: {formatDate(task.due_date)}
                    </span>
                  </div>
                )}
              </div>

              {/* Delete button */}
              {canEdit && (
                <button
                  onClick={() => handleDelete(task)}
                  disabled={isLoading}
                  className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity hover:opacity-70"
                >
                  {loading === 'del-' + task.id ? (
                    <Loader2 size={14} className="animate-spin" style={{ color: '#b3362a' }} />
                  ) : (
                    <Trash2 size={14} style={{ color: '#b3362a' }} />
                  )}
                </button>
              )}
            </div>
          )
        })}

        {/* Add task form */}
        {adding && (
          <form
            ref={formRef}
            action={handleAdd}
            className="px-4 py-3 space-y-3"
            style={{ background: '#e9f1fb', borderTop: '1px solid #c9dcf3' }}
          >
            <div className="space-y-2">
              <input
                name="title"
                placeholder="Nama pekerjaan / tugas..."
                required
                autoFocus
                className="w-full text-sm px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
                style={{
                  border: '1px solid #c9dcf3',
                  background: 'white',
                  color: 'var(--text-primary)',
                }}
              />
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>
                  Target selesai:
                </label>
                <input
                  name="due_date"
                  type="date"
                  className="text-sm px-2 py-1 rounded-lg outline-none"
                  style={{ border: '1px solid #c9dcf3', background: 'white', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={loading === 'add'}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: '#2458a6' }}
              >
                {loading === 'add' ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Simpan
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100"
                style={{ color: 'var(--text-muted)' }}
              >
                Batal
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
