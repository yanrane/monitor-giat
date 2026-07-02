import { ChevronDown } from 'lucide-react'

// Dropdown native <details> — tanpa JS klien
export function Collapsible({ title, defaultOpen = false, children }: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <details
      className="rounded-2xl overflow-hidden bg-white group"
      style={{ border: '1px solid var(--cream-border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
      open={defaultOpen || undefined}
    >
      <summary
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden transition-colors hover:bg-gray-50"
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform group-open:rotate-180"
          style={{ color: 'var(--text-muted)' }}
        />
      </summary>
      <div className="px-4 pb-4 pt-3" style={{ borderTop: '1px solid var(--cream-border)' }}>
        {children}
      </div>
    </details>
  )
}
