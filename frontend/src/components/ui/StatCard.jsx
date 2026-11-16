export function StatCard({ icon: Icon, label, value, helper, tone = 'brand', compact = false }) {
  const tones = {
    brand: 'bg-brand/10 text-brand',
    accent: 'bg-accent/10 text-accent',
    ink: 'bg-ink/10 text-ink',
  }

  return (
    <div className={`group rounded-2xl border border-line/80 bg-panel shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-lg hover:shadow-ink/[0.04] ${compact ? 'p-3.5 md:p-5' : 'p-5'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-muted ${compact ? 'text-xs leading-tight sm:text-sm' : 'text-sm'}`}>{label}</p>
          <p className={`font-semibold tracking-tight text-ink tabular-nums ${compact ? 'mt-2 text-xl sm:text-2xl md:mt-3' : 'mt-2 text-2xl'}`}>{value}</p>
        </div>
        <div className={`grid place-items-center rounded-xl ${tones[tone] || tones.brand} flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${compact ? 'size-9' : 'size-10'}`}>
          <Icon size={compact ? 16 : 18} strokeWidth={2} />
        </div>
      </div>
      {helper ? <p className={`${compact ? 'mt-2 hidden text-xs text-muted sm:block' : 'mt-3 text-xs text-muted'}`}>{helper}</p> : null}
    </div>
  )
}
