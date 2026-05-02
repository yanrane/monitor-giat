'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { type Department, type Activity, type ActivityStatus } from '@/lib/types'
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
})

type FormData = z.infer<typeof schema>

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
}

export function ActivityForm({ department, userId, activity }: ActivityFormProps) {
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
    },
  })

  async function onSubmit(data: FormData) {
    const payload = { ...data, dept_id: department.id, created_by: userId }
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
