export function StatCard({ icon: Icon, label, value, helper, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand/10 text-brand',
    accent: 'bg-accent/10 text-accent',
    ink: 'bg-ink/10 text-ink',
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal text-ink">{value}</p>
        </div>
        <div className={`grid size-8 place-items-center rounded-md ${tones[tone] || tones.brand} flex-shrink-0`}>
          <Icon size={18} strokeWidth={2} />
        </div>
      </div>
      {helper ? <p className="mt-3 text-xs text-muted">{helper}</p> : null}
    </div>
  )
}
