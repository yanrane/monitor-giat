'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Attachment, type Profile } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Upload, Download, File, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface FileUploaderProps {
  activityId: string
  attachments: Attachment[]
  currentUser: Profile
}

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export function FileUploader({ activityId, attachments: initial, currentUser }: FileUploaderProps) {
  const [attachments, setAttachments] = useState(initial)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const canUpload = currentUser.role !== 'kadiv'

  async function handleUpload(file: File) {
    if (file.size > MAX_SIZE) {
      toast.error('Ukuran file maksimal 10MB')
      return
    }
    setUploading(true)
    const path = `${activityId}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file)
    if (uploadError) {
      toast.error('Gagal upload file')
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
    const { data, error } = await supabase
      .from('attachments')
      .insert({
        activity_id: activityId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        uploaded_by: currentUser.id,
      })
      .select('*, profiles(full_name)')
      .single()

    if (error) {
      toast.error('Gagal menyimpan info file')
    } else {
      setAttachments((prev) => [...prev, data as Attachment])
      toast.success('File berhasil diupload')
    }
    setUploading(false)
  }

  async function handleDelete(att: Attachment) {
    const { error } = await supabase.from('attachments').delete().eq('id', att.id)
    if (error) {
      toast.error('Gagal menghapus file')
    } else {
      setAttachments((prev) => prev.filter((a) => a.id !== att.id))
    }
  }

  return (
    <div className="space-y-3">
      {attachments.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Belum ada lampiran.</p>
      )}
      {attachments.map((att) => (
        <div key={att.id} className="flex items-center gap-3 p-3 border rounded-lg">
          <File size={18} className="text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{att.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {att.profiles?.full_name} · {formatDateTime(att.created_at)}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            <a href={att.file_url} download={att.file_name} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="icon" title="Download">
                <Download size={14} />
              </Button>
            </a>
            {(currentUser.role === 'dept_head' && att.uploaded_by === currentUser.id) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(att)}
                className="text-red-500 hover:text-red-700"
                title="Hapus"
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
      ))}

      {canUpload && (
        <>
          <input
            type="file"
            ref={inputRef}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file)
              e.target.value = ''
            }}
          />
          <Button
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full"
          >
            <Upload size={16} className="mr-2" />
            {uploading ? 'Mengupload...' : 'Upload Dokumen (maks. 10MB)'}
          </Button>
        </>
      )}
    </div>
  )
}
