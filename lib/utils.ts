import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// Tanggal kalender (YYYY-MM-DD) dalam zona WIB, aman dijalankan di server UTC
export function wibDateStr(date: Date | string = new Date()) {
  return new Date(date).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
}

// Selisih hari kalender WIB antara sekarang dan tanggal tersebut
export function daysSinceWIB(dateStr: string) {
  const diff = Date.parse(wibDateStr()) - Date.parse(wibDateStr(dateStr))
  return Math.round(diff / 86400000)
}

export type StaleLevel = 'ok' | 'warning' | 'critical'

export function staleLevel(days: number): StaleLevel {
  if (days >= 14) return 'critical'
  if (days >= 7) return 'warning'
  return 'ok'
}
