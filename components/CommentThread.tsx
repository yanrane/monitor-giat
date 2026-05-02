'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Comment, type Profile } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

interface CommentThreadProps {
  activityId: string
  comments: Comment[]
  currentUser: Profile
}

export function CommentThread({ activityId, comments: initial, currentUser }: CommentThreadProps) {
  const [comments, setComments] = useState(initial)
  const [content, setContent]   = useState('')
  const [loading, setLoading]   = useState(false)
  const supabase = createClient()

  const canComment = currentUser.role === 'kadiv' || currentUser.role === 'dept_head'

  async function handleSubmit() {
    if (!content.trim()) return
    setLoading(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({ activity_id: activityId, author_id: currentUser.id, content: content.trim() })
      .select('*, profiles(full_name, role)')
      .single()

    if (error) {
      toast.error('Gagal mengirim komentar')
    } else {
      setComments((prev) => [...prev, data as Comment])
      setContent('')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {comments.length === 0 && (
        <div
          className="text-center py-10 rounded-2xl"
          style={{ background: 'white', border: '1px solid var(--cream-border)' }}
        >
          <MessageSquare size={28} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--navy-900)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada komentar.</p>
        </div>
      )}

      <div className="space-y-3">
        {comments.map((c) => {
          const isKadiv = c.profiles?.role === 'kadiv'
          const initials = c.profiles?.full_name?.slice(0, 2).toUpperCase() ?? 'U'
          return (
            <div key={c.id} className="flex gap-3">
              <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                <AvatarFallback
                  className="text-xs font-bold"
                  style={
                    isKadiv
                      ? { background: 'var(--gold-500)', color: 'white' }
                      : { background: 'var(--navy-100)', color: 'var(--navy-700)' }
                  }
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div
                  className="rounded-xl px-4 py-3"
                  style={
                    isKadiv
                      ? { background: 'var(--gold-50)', border: '1px solid var(--gold-100)' }
                      : { background: 'white', border: '1px solid var(--cream-border)' }
                  }
                >
                  <div className="flex flex-wrap items-baseline gap-2 mb-1.5">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {c.profiles?.full_name}
                    </span>
                    {isKadiv && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--gold-500)', color: 'white' }}
                      >
                        Kadiv
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDateTime(c.created_at)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {c.content}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {canComment && (
        <div
          className="flex gap-3 pt-2 items-end"
        >
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback
              className="text-xs font-bold"
              style={
                currentUser.role === 'kadiv'
                  ? { background: 'var(--gold-500)', color: 'white' }
                  : { background: 'var(--navy-100)', color: 'var(--navy-700)' }
              }
            >
              {currentUser.full_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex gap-2 items-end">
            <textarea
              placeholder="Tulis komentar... (Ctrl+Enter untuk kirim)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
              }}
              rows={3}
              className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{
                background: 'white',
                border: '1.5px solid var(--cream-border)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--navy-600)'; e.target.style.boxShadow = '0 0 0 3px rgba(29,58,107,0.1)' }}
              onBlur={(e)  => { e.target.style.borderColor = 'var(--cream-border)'; e.target.style.boxShadow = 'none' }}
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !content.trim()}
              className="flex items-center justify-center w-10 h-10 rounded-xl transition-all shrink-0"
              style={{
                background: loading || !content.trim() ? 'var(--cream-dark)' : 'var(--navy-900)',
                color: loading || !content.trim() ? 'var(--text-muted)' : 'white',
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
