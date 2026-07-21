'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  type Department, type Activity, type ActivityStatus, type Profile,
  type ActivityPriority, type ControlStatus,
  PRIORITY_LABELS, PRIORITY_HINT, CONTROL_STATUS_LABELS,
} from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const schema = z.object({
  title:        z.string().min(3, 'Judul minimal 3 karakter'),
  description:  z.string().optional(),
  start_date:   z.string().min(1, 'Tanggal mulai wajib diisi'),
  end_date:     z.string().min(1, 'Tanggal selesai wajib diisi'),
  status:       z.enum(['belum_mulai', 'berjalan', 'selesai', 'ditunda'] as const),
  output_notes: z.string().optional(),
  pic_id:       z.string().optional(),
  priority:     z.enum(['p1', 'p2', 'p3'] as const),
  control_status:       z.string().optional(),
  blocker:              z.string().optional(),
  next_action:          z.string().optional(),
  next_action_due_date: z.string().optional(),
  decision_needed:      z.string().optional(),
})

type FormData = z.infer<typeof schema>

// Field yang dianggap "update substansi" — edit judul/tanggal biasa tidak dihitung
const SUBSTANTIVE_FIELDS = [
  'priority', 'control_status', 'blocker', 'next_action',
  'next_action_due_date', 'decision_needed', 'output_notes',
] as const

const normalize = (v: string | null | undefined) => {
  const t = typeof v === 'string' ? v.trim() : v
  return t ? t : null
}

const inputStyle: React.CSSProperties = {
  background: 'var(--gray-100)',
  border: '1px solid var(--gray-300)',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  letterSpacing: '-0.01em',
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all'

function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.background = 'white'
  e.target.style.borderColor = 'var(--blue)'
  e.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'
}
function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.background = 'var(--gray-100)'
  e.target.style.borderColor = 'var(--gray-300)'
  e.target.style.boxShadow = 'none'
}

interface ActivityFormProps {
  department: Department
  userId: string
  activity?: Activity
  deptMembers?: Profile[]
}

export function ActivityForm({ department, userId, activity, deptMembers = [] }: ActivityFormProps) {
  const router   = useRouter()
  const supabase = createClient()
  const isEdit   = !!activity

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title:        activity?.title ?? '',
      description:  activity?.description ?? '',
      start_date:   activity?.start_date ? activity.start_date.slice(0, 16) : '',
      end_date:     activity?.end_date   ? activity.end_date.slice(0, 16)   : '',
      status:       (activity?.status as ActivityStatus) ?? 'belum_mulai',
      output_notes: activity?.output_notes ?? '',
      pic_id:       activity?.pic_id ?? '',
      priority:     activity?.priority ?? 'p2',
      control_status:       activity?.control_status ?? '',
      blocker:              activity?.blocker ?? '',
      next_action:          activity?.next_action ?? '',
      next_action_due_date: activity?.next_action_due_date?.slice(0, 10) ?? '',
      decision_needed:      activity?.decision_needed ?? '',
    },
  })

  async function onSubmit(data: FormData) {
    const isDone = data.status === 'selesai'
    const payload: Record<string, unknown> = {
      ...data,
      pic_id: data.pic_id || null,
      dept_id: department.id,
      created_by: userId,
      // Status kendali hanya relevan untuk pekerjaan yang belum selesai
      control_status: isDone ? null : (normalize(data.control_status) as ControlStatus | null),
      blocker:              normalize(data.blocker),
      next_action:          normalize(data.next_action),
      next_action_due_date: normalize(data.next_action_due_date),
      decision_needed:      normalize(data.decision_needed),
    }

    const substantiveChanged = !isEdit || SUBSTANTIVE_FIELDS.some(
      (f) => normalize(payload[f] as string | null) !== normalize(activity![f])
    )
    if (substantiveChanged) {
      payload.last_substantive_update_at = new Date().toISOString()
      payload.last_substantive_update_by = userId
    }

    let error
    if (isEdit) {
      ;({ error } = await supabase.from('activities').update(payload).eq('id', activity!.id))
    } else {
      ;({ error } = await supabase.from('activities').insert(payload))
    }
    if (error) {
      toast.error(isEdit ? 'Gagal memperbarui kegiatan' : 'Gagal menyimpan kegiatan')
      return
    }
    toast.success(isEdit ? 'Kegiatan berhasil diperbarui' : 'Kegiatan berhasil ditambahkan')
    router.push(`/departments/${department.id}`)
    router.refresh()
  }

  const statusVal    = watch('status')
  const showControl  = statusVal !== 'selesai'
  const decisionFilled = !!watch('decision_needed')?.trim()

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </label>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <Label>Judul Kegiatan <span style={{ color: 'var(--destructive)' }}>*</span></Label>
        <input
          {...register('title')}
          placeholder="Contoh: Sidang PN Jakarta Perkara No. 123"
          className={inputCls}
          style={inputStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {errors.title && (
          <p className="text-xs mt-1 font-medium" style={{ color: 'var(--destructive)' }}>{errors.title.message}</p>
        )}
      </div>

      <div>
        <Label>Deskripsi</Label>
        <textarea
          {...register('description')}
          placeholder="Penjelasan singkat kegiatan..."
          rows={3}
          className={`${inputCls} resize-none`}
          style={inputStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Tanggal Mulai <span style={{ color: 'var(--destructive)' }}>*</span></Label>
          <input
            type="datetime-local"
            {...register('start_date')}
            className={inputCls}
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
          {errors.start_date && (
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--destructive)' }}>{errors.start_date.message}</p>
          )}
        </div>
        <div>
          <Label>Tanggal Selesai <span style={{ color: 'var(--destructive)' }}>*</span></Label>
          <input
            type="datetime-local"
            {...register('end_date')}
            className={inputCls}
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
          {errors.end_date && (
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--destructive)' }}>{errors.end_date.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Status</Label>
          <Select
            defaultValue={watch('status')}
            onValueChange={(val) => setValue('status', val as ActivityStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="belum_mulai">Belum Mulai</SelectItem>
              <SelectItem value="berjalan">Sedang Berjalan</SelectItem>
              <SelectItem value="selesai">Selesai</SelectItem>
              <SelectItem value="ditunda">Ditunda</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {deptMembers.length > 0 && (
          <div>
            <Label>PIC (Penanggung Jawab)</Label>
            <Select
              defaultValue={watch('pic_id') ?? ''}
              onValueChange={(val) => setValue('pic_id', val === 'none' ? '' : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih PIC..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Tidak ada —</SelectItem>
                {deptMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ── Kendali Pekerjaan ─────────────────────────────── */}
      <div className="pt-1">
        <div className="flex items-center gap-3 mb-4">
          <p className="text-xs font-bold uppercase tracking-widest shrink-0" style={{ color: 'var(--text-muted)' }}>
            Kendali Pekerjaan
          </p>
          <div className="h-px flex-1" style={{ background: 'var(--gray-300)' }} />
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Prioritas</Label>
              <Select
                defaultValue={watch('priority')}
                onValueChange={(val) => setValue('priority', val as ActivityPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABELS) as ActivityPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{PRIORITY_HINT}</p>
            </div>

            {showControl && (
              <div>
                <Label>Status Kendali</Label>
                <Select
                  defaultValue={watch('control_status') || 'none'}
                  onValueChange={(val) => setValue('control_status', val === 'none' ? '' : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status kendali..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Belum diisi —</SelectItem>
                    {(Object.keys(CONTROL_STATUS_LABELS) as ControlStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{CONTROL_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {showControl && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Next Action</Label>
                  <input
                    {...register('next_action')}
                    placeholder="Contoh: Kirim draf somasi ke Dept Head"
                    className={inputCls}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
                <div>
                  <Label>Target Next Action</Label>
                  <input
                    type="date"
                    {...register('next_action_due_date')}
                    className={inputCls}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
              </div>

              <div>
                <Label>Blocker (opsional)</Label>
                <textarea
                  {...register('blocker')}
                  placeholder="Apa yang menghambat pekerjaan ini..."
                  rows={2}
                  className={`${inputCls} resize-none`}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div
                className={decisionFilled ? 'rounded-xl p-3 -m-0.5' : undefined}
                style={decisionFilled ? { background: '#fdf3e3', border: '1px solid #eed9b4' } : undefined}
              >
                <Label>
                  Keputusan yang Dibutuhkan dari Kadiv (opsional)
                  {decisionFilled && (
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle" style={{ background: '#eed9b4', color: '#a05c0a' }}>
                      MASUK DECISION QUEUE
                    </span>
                  )}
                </Label>
                <textarea
                  {...register('decision_needed')}
                  placeholder="Isi hanya jika ada keputusan yang harus diambil Kadiv..."
                  rows={2}
                  className={`${inputCls} resize-none`}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div>
        <Label>Output / Hasil Kegiatan</Label>
        <textarea
          {...register('output_notes')}
          placeholder="Dokumen yang dihasilkan, keputusan yang dicapai..."
          rows={3}
          className={`${inputCls} resize-none`}
          style={inputStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{
            border: '1px solid var(--gray-300)',
            color: 'var(--text-secondary)',
            background: 'var(--gray-100)',
          }}
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{
            background: isSubmitting ? 'var(--blue-dark)' : 'var(--blue)',
            boxShadow: isSubmitting ? 'none' : '0 2px 8px rgba(0,113,227,0.3)',
          }}
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          {isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Kegiatan'}
        </button>
      </div>
    </form>
  )
}
