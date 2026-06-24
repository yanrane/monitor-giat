'use client'

import { useState } from 'react'
import { type Department } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'
import { inviteUser } from './actions'

interface InviteUserFormProps {
  departments: Department[]
}

export function InviteUserForm({ departments }: InviteUserFormProps) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'dept_head' | 'staff'>('dept_head')
  const [deptId, setDeptId] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!deptId) { toast.error('Pilih departemen'); return }
    setLoading(true)

    const { error } = await inviteUser(email, fullName, role, deptId)
    if (error) {
      toast.error(`Gagal membuat akun: ${error}`)
      setLoading(false)
      return
    }

    toast.success(`Akun berhasil dibuat. Email reset password dikirim ke ${email}.`)
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
