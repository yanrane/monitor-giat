export type Role = 'kadiv' | 'dept_head' | 'staff'
export type ActivityStatus = 'belum_mulai' | 'berjalan' | 'selesai' | 'ditunda'
export type TaskStatus = 'pending' | 'done'
export type ExpenseCategory = 'tiket' | 'honor' | 'hotel' | 'lainnya'
export type NotificationType = 'status_change' | 'new_comment' | 'deadline_reminder'

export interface Department {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  role: Role
  dept_id: string | null
  created_at: string
  departments?: Department
}

export interface Activity {
  id: string
  dept_id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  status: ActivityStatus
  output_notes: string | null
  pic_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  departments?: Department
  profiles?: Profile
  pic?: Profile
  tasks?: Pick<Task, 'id' | 'status'>[]
}

export interface DailyLog {
  id: string
  user_id: string
  log_date: string
  content: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface Comment {
  id: string
  activity_id: string
  author_id: string
  content: string
  created_at: string
  profiles?: Profile
}

export interface Attachment {
  id: string
  activity_id: string
  file_name: string
  file_url: string
  uploaded_by: string
  created_at: string
  profiles?: Profile
}

export interface Task {
  id: string
  activity_id: string
  title: string
  due_date: string | null
  status: TaskStatus
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface Expense {
  id: string
  category: ExpenseCategory
  description: string
  amount: number
  expense_date: string
  recipient_name: string | null
  created_by: string
  dept_id: string | null
  attachment_url: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
  departments?: Department
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  activity_id: string | null
  is_read: boolean
  created_at: string
  activities?: Activity
}

export const STATUS_LABELS: Record<ActivityStatus, string> = {
  belum_mulai: 'Belum Mulai',
  berjalan: 'Sedang Berjalan',
  selesai: 'Selesai',
  ditunda: 'Ditunda',
}

export const STATUS_COLORS: Record<ActivityStatus, string> = {
  belum_mulai: 'bg-blue-100 text-blue-800',
  berjalan: 'bg-yellow-100 text-yellow-800',
  selesai: 'bg-green-100 text-green-800',
  ditunda: 'bg-red-100 text-red-800',
}

export const DEPT_COLORS: Record<string, string> = {
  Litigasi: 'bg-purple-100 text-purple-800 border-purple-200',
  'Non-Litigasi': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Konsultasi & Legal Opinion': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'Asset Dispute': 'bg-orange-100 text-orange-800 border-orange-200',
}

export const DEPT_BG_COLORS: Record<string, string> = {
  Litigasi: '#9333ea',
  'Non-Litigasi': '#4f46e5',
  'Konsultasi & Legal Opinion': '#0891b2',
  'Asset Dispute': '#ea580c',
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  tiket: 'Tiket Transportasi',
  honor: 'Pembayaran Honor',
  hotel: 'Akomodasi Hotel',
  lainnya: 'Pengeluaran Lainnya',
}

export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  tiket: '#0891b2',
  honor: '#7c3aed',
  hotel: '#059669',
  lainnya: '#d97706',
}
