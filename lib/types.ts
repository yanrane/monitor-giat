export type Role = 'kadiv' | 'dept_head' | 'staff'
export type ActivityStatus = 'belum_mulai' | 'berjalan' | 'selesai' | 'ditunda'
export type ActivityPriority = 'p1' | 'p2' | 'p3'
export type ControlStatus =
  | 'on_track'
  | 'waiting_internal'
  | 'waiting_external'
  | 'needs_kadiv_decision'
  | 'blocked'
  | 'escalated'
export type TaskStatus = 'pending' | 'done'
export type ExpenseCategory = 'tiket' | 'honor' | 'hotel' | 'sewa_kendaraan' | 'lainnya'
export type NotificationType = 'status_change' | 'new_comment' | 'deadline_reminder' | 'briefing'

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
  phone: string | null
  is_active: boolean
  is_budget_viewer: boolean
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
  priority: ActivityPriority
  control_status: ControlStatus | null
  blocker: string | null
  next_action: string | null
  next_action_due_date: string | null
  decision_needed: string | null
  last_substantive_update_at: string | null
  last_substantive_update_by: string | null
  created_by: string
  created_at: string
  updated_at: string
  departments?: Department
  profiles?: Profile
  pic?: Profile
  last_updater?: Profile
  tasks?: Pick<Task, 'id' | 'status'>[]
}

export type DecisionAction =
  | 'approve_continue'
  | 'beri_arahan'
  | 'minta_klarifikasi'
  | 'eskalasi_kembalikan'

export interface ActivityDecision {
  id: string
  activity_id: string
  action: DecisionAction
  instruction: string
  decision_needed_snapshot: string | null
  resulting_control_status: ControlStatus
  next_action: string | null
  next_action_due_date: string | null
  decided_by: string
  created_at: string
  decider?: Pick<Profile, 'full_name'>
}

export interface DailyLog {
  id: string
  user_id: string
  log_date: string
  content: string
  location: string | null
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

export interface ProgressItem {
  id: string
  title: string
  pic_id: string
  target_date: string
  status: TaskStatus
  completed_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  pic?: Profile
}

export type BudgetType = 'opex' | 'capex'

export interface Expense {
  id: string
  category: ExpenseCategory
  budget_type: BudgetType
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

export const PRIORITY_LABELS: Record<ActivityPriority, string> = {
  p1: 'P1 — Kritis',
  p2: 'P2 — Penting',
  p3: 'P3 — Rutin',
}

// P1: BRN/smelter, litigasi/pidana material, risiko SHGB/HGB & aset kritis,
// deadline regulator/Direksi. Klasifikasi dilakukan manual, bukan otomatis.
export const PRIORITY_HINT =
  'P1 untuk perkara BRN/smelter, litigasi material, risiko aset/SHGB kritis, atau deadline regulator/Direksi'

export const PRIORITY_COLORS: Record<ActivityPriority, string> = {
  p1: 'bg-red-100 text-red-800 border-red-200',
  p2: 'bg-blue-100 text-blue-800 border-blue-200',
  p3: 'bg-gray-100 text-gray-600 border-gray-200',
}

export const CONTROL_STATUS_LABELS: Record<ControlStatus, string> = {
  on_track: 'Sesuai Rencana',
  waiting_internal: 'Menunggu Internal',
  waiting_external: 'Menunggu Pihak Eksternal',
  needs_kadiv_decision: 'Butuh Keputusan Kadiv',
  blocked: 'Terhambat',
  escalated: 'Eskalasi',
}

export const CONTROL_STATUS_COLORS: Record<ControlStatus, string> = {
  on_track: 'bg-green-100 text-green-800 border-green-200',
  waiting_internal: 'bg-amber-100 text-amber-800 border-amber-200',
  waiting_external: 'bg-orange-100 text-orange-800 border-orange-200',
  needs_kadiv_decision: 'bg-purple-100 text-purple-800 border-purple-200',
  blocked: 'bg-red-100 text-red-800 border-red-200',
  escalated: 'bg-red-100 text-red-800 border-red-200',
}

export const DECISION_ACTION_LABELS: Record<DecisionAction, string> = {
  approve_continue: 'Approve & Continue',
  beri_arahan: 'Beri Arahan',
  minta_klarifikasi: 'Minta Klarifikasi',
  eskalasi_kembalikan: 'Eskalasi / Kembalikan ke PIC',
}

// Status kendali hasil keputusan — needs_kadiv_decision dan escalated
// sengaja tidak tersedia agar kegiatan keluar dari antrean keputusan
// dashboard setelah diputus (keduanya masuk predikat antrean Kadiv)
export const DECISION_RESULT_STATUSES: ControlStatus[] = [
  'on_track',
  'waiting_internal',
  'waiting_external',
  'blocked',
]

export const DECISION_DEFAULT_STATUS: Record<DecisionAction, ControlStatus> = {
  approve_continue: 'on_track',
  beri_arahan: 'on_track',
  minta_klarifikasi: 'waiting_internal',
  eskalasi_kembalikan: 'waiting_internal',
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
  sewa_kendaraan: 'Sewa Kendaraan',
  lainnya: 'Pengeluaran Lainnya',
}

export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  tiket: '#0891b2',
  honor: '#7c3aed',
  hotel: '#059669',
  sewa_kendaraan: '#e11d48',
  lainnya: '#d97706',
}

// ── Daily Briefing ─────────────────────────────────────

export interface BriefingViralNews {
  title: string
  url: string
  source: string
  summary: string
  relevance_score: number // 0–10
  category?: string
}

export interface BriefingEvaluation {
  department: string
  score: number // 1–10 (evaluasi performa)
  strengths: string[]
  issues: string[]
  recommendation: string
}

export interface MorningBriefing {
  id: string
  briefing_date: string
  viral_news: BriefingViralNews[]
  evaluations: BriefingEvaluation[]
  overall_insight: string
  generated_by: string
  created_at: string
}
