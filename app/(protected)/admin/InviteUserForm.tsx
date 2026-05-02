'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Department } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'

interface InviteUserFormProps {
  departments: Department[]
}

export function InviteUserForm({ departments }: InviteUserFormProps) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'dept_head' | 'staff'>('dept_head')
  const [deptId, setDeptId] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!deptId) { toast.error('Pilih departemen'); return }
    setLoading(true)

    // Use Supabase admin invite - this requires service role in real setup
    // For now, use signUp with auto-confirm
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
    const { data, error } = await supabase.auth.signUp({
      email,
      password: tempPassword,
      options: { data: { full_name: fullName } },
    })

    if (error || !data.user) {
      toast.error(`Gagal membuat akun: ${error?.message}`)
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: fullName,
      role,
      dept_id: deptId,
    })

    if (profileError) {
      toast.error('Gagal membuat profil pengguna')
      setLoading(false)
      return
    }

    toast.success(`Akun berhasil dibuat. Sampaikan ke ${email} untuk ganti password.`)
    setEmail(''); setFullName(''); setDeptId('')
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus size={16} />
          Undang Pengguna Baru
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nama Lengkap</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ibu Endang" required />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="endang@pttimah.co.id" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'dept_head' | 'staff')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dept_head">Dept Head</SelectItem>
                  <SelectItem value="staff">Staf</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Departemen</Label>
              <Select value={deptId} onValueChange={setDeptId}>
                <SelectTrigger><SelectValue placeholder="Pilih dept..." /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Membuat akun...' : 'Buat Akun'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
