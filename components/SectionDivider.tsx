export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="h-px flex-1" style={{ background: 'var(--cream-border)' }} />
      <span className="text-xs font-bold uppercase tracking-widest text-center" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <div className="h-px flex-1" style={{ background: 'var(--cream-border)' }} />
    </div>
  )
}
