export function StatCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
        </div>
        <div className="grid size-10 place-items-center rounded-md bg-brand/10 text-brand">
          <Icon size={20} strokeWidth={2} />
        </div>
      </div>
      {helper ? <p className="mt-3 text-xs text-muted">{helper}</p> : null}
    </div>
  )
}
