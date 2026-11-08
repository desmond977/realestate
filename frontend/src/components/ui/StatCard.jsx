export function StatCard({ icon: Icon, label, value, helper, tone = 'brand', compact = false }) {
  const tones = {
    brand: 'bg-brand/10 text-brand',
    accent: 'bg-accent/10 text-accent',
    ink: 'bg-ink/10 text-ink',
  }

  return (
    <div className={`rounded-lg border border-line bg-panel shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${compact ? 'p-3 md:p-4' : 'p-4'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-muted ${compact ? 'text-xs leading-tight sm:text-sm' : 'text-sm'}`}>{label}</p>
          <p className={`font-semibold tracking-normal text-ink ${compact ? 'mt-1.5 text-xl sm:text-2xl md:mt-2' : 'mt-2 text-2xl'}`}>{value}</p>
        </div>
        <div className={`grid place-items-center rounded-md ${tones[tone] || tones.brand} flex-shrink-0 ${compact ? 'size-7 sm:size-8' : 'size-8'}`}>
          <Icon size={compact ? 16 : 18} strokeWidth={2} />
        </div>
      </div>
      {helper ? <p className={`${compact ? 'mt-2 hidden text-xs text-muted sm:block' : 'mt-3 text-xs text-muted'}`}>{helper}</p> : null}
    </div>
  )
}
