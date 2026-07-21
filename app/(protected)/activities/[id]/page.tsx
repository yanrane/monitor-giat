import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/StatusBadge'
import { PriorityBadge } from '@/components/PriorityBadge'
import { ActivityControlCard } from '@/components/ActivityControlCard'
import { CommentThread } from '@/components/CommentThread'
import { FileUploader } from '@/components/FileUploader'
import { TaskList } from '@/components/TaskList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type Activity, type Comment, type Attachment, type Profile, type Task, DEPT_BG_COLORS } from '@/lib/types'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ArrowLeft, Pencil, CalendarDays, FileText, User, UserCheck } from 'lucide-react'
import { DeleteActivityButton } from './DeleteActivityButton'

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: activity },
    { data: comments },
    { data: attachments },
    { data: profile },
    { data: tasks },
  ] = await Promise.all([
    supabase.from('activities').select('*, departments(name), profiles!created_by(full_name), pic:profiles!pic_id(full_name), last_updater:profiles!last_substantive_update_by(full_name)').eq('id', id).single(),
    supabase.from('comments').select('*, profiles(full_name, role)').eq('activity_id', id).order('created_at'),
    supabase.from('attachments').select('*, profiles(full_name)').eq('activity_id', id).order('created_at'),
    supabase.from('profiles').select('*, departments(name)').eq('id', user.id).single(),
    supabase.from('tasks').select('*, profiles(full_name)').eq('activity_id', id).order('created_at'),
  ])

  if (!activity) notFound()

  const act         = activity as Activity & { pic: { full_name: string } | null }
  const currentUser = profile as Profile
  const canEdit     = currentUser.role !== 'kadiv' && currentUser.dept_id === act.dept_id
  const canDelete   = (currentUser.role === 'dept_head' && currentUser.dept_id === act.dept_id)
                   || (currentUser.role === 'staff' && act.created_by === user.id)
  const deptName    = act.departments?.name ?? ''
  const accent      = DEPT_BG_COLORS[deptName] ?? 'var(--navy-600)'

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Breadcrumb + actions */}
      <div className="flex items-center gap-2">
        <Link
          href={`/departments/${act.dept_id}`}
          className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={15} />
          <span>{deptName || 'Departemen'}</span>
        </Link>
        <div className="flex-1" />
        {canEdit && (
          <Link
            href={`/activities/${id}/edit`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
            style={{
              border: '1px solid var(--cream-border)',
              color: 'var(--text-secondary)',
              background: 'white',
            }}
          >
            <Pencil size={12} />
            Edit
          </Link>
        )}
        {canDelete && <DeleteActivityButton activityId={id} deptId={act.dept_id} />}
      </div>

      {/* Header card */}
      <div
        className="bg-white rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--cream-border)', boxShadow: '0 2px 8px rgba(11,25,41,0.06)' }}
      >
        <div className="h-1" style={{ background: accent }} />
        <div className="p-5">
          {deptName && (
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
              {deptName}
            </p>
          )}
          <h1 className="font-serif leading-snug mb-3" style={{ fontSize: '22px', color: 'var(--navy-900)' }}>
            {act.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={act.status} />
            <PriorityBadge priority={act.priority} />
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <CalendarDays size={12} />
              {formatDate(act.start_date)} — {formatDate(act.end_date)}
            </span>
            {act.pic && (
              <span
                className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--navy-100)', color: 'var(--navy-700)' }}
              >
                <UserCheck size={11} />
                PIC: {act.pic.full_name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Kendali Pekerjaan */}
      <ActivityControlCard activity={act} />

      {/* Tabs */}
      <Tabs defaultValue="tasks">
        <TabsList className="w-full">
          <TabsTrigger value="tasks" className="flex-1">
            Pekerjaan
            {(tasks?.length ?? 0) > 0 && (
              <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>
                {tasks?.filter((t) => t.status === 'done').length}/{tasks?.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="detail"      className="flex-1">Detail</TabsTrigger>
          <TabsTrigger value="comments"    className="flex-1">
            Komentar
            {(comments?.length ?? 0) > 0 && (
              <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--navy-100)', color: 'var(--navy-600)' }}>
                {comments?.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="attachments" className="flex-1">
            Lampiran
            {(attachments?.length ?? 0) > 0 && (
              <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--navy-100)', color: 'var(--navy-600)' }}>
                {attachments?.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <TaskList
            activityId={id}
            tasks={(tasks as Task[]) ?? []}
            currentUser={currentUser}
          />
        </TabsContent>

        <TabsContent value="detail" className="mt-4 space-y-4">
          {act.description ? (
            <div
              className="bg-white rounded-xl p-4"
              style={{ border: '1px solid var(--cream-border)' }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                Deskripsi
              </p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {act.description}
              </p>
            </div>
          ) : null}

          {act.output_notes ? (
            <div
              className="rounded-xl p-4"
              style={{ background: '#e9f5ef', border: '1px solid #bfe3d2' }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: '#1e7a56' }}>
                <FileText size={12} /> Output / Hasil
              </p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#1e7a56' }}>
                {act.output_notes}
              </p>
            </div>
          ) : null}

          <div
            className="rounded-xl p-4 space-y-2"
            style={{ background: 'var(--cream-dark)', border: '1px solid var(--cream-border)' }}
          >
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <User size={11} />
              <span>Dibuat oleh <strong>{act.profiles?.full_name}</strong></span>
            </div>
            {act.pic && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <UserCheck size={11} />
                <span>PIC: <strong>{act.pic.full_name}</strong></span>
              </div>
            )}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Dibuat: {formatDateTime(act.created_at)}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Diperbarui: {formatDateTime(act.updated_at)}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <CommentThread
            activityId={id}
            comments={comments as Comment[] ?? []}
            currentUser={currentUser}
          />
        </TabsContent>

        <TabsContent value="attachments" className="mt-4">
          <FileUploader
            activityId={id}
            attachments={attachments as Attachment[] ?? []}
            currentUser={currentUser}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
