import { Building2, CalendarDays, Clock3, MapPin, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { propertyImageUrl } from '../../api/client'
import { rentalPropertiesApi } from '../../services/clientApi'
import { formatMoney } from '../../utils/formatters'

function dateLabel(value) {
  if (!value) return 'Not specified'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? 'Not specified'
    : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function frequencyLabel(value) {
  if (!value) return 'Rent'
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

export function ClientRentalPropertiesPage() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    rentalPropertiesApi.list()
      .then((response) => {
        if (active) setProperties(response.data.data?.properties || [])
      })
      .catch(() => {
        if (active) setError('Unable to load your rented properties. Please try again later.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 sm:space-y-8">
      <header className="overflow-hidden rounded-3xl border border-line/80 bg-panel shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <p className="text-sm font-semibold text-brand">Rental Management</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Rented properties</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Properties covered by your active rental agreements, with the key details for each tenancy.</p>
          </div>
          {!loading && !error ? (
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-canvas px-3.5 py-2 text-sm font-medium text-ink">
              <Building2 size={16} className="text-brand" />
              {properties.length} {properties.length === 1 ? 'property' : 'properties'}
            </span>
          ) : null}
        </div>
      </header>

      {loading ? (
        <div role="status" className="rounded-2xl border border-line bg-panel p-6 text-sm text-muted shadow-sm">Loading your rental properties…</div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}</div>
      ) : null}

      {!loading && !error && properties.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-panel px-5 py-12 text-center shadow-sm sm:py-16">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand"><Building2 size={25} /></span>
          <h2 className="mt-4 text-lg font-semibold text-ink">No active rental properties</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Properties will appear here when they’re included in an active rental agreement.</p>
        </div>
      ) : null}

      <section aria-label="Active rented properties" className="grid gap-5 md:grid-cols-2">
        {properties.map((item) => {
          const rentalProperty = item.rental_property || {}
          const property = rentalProperty.property || {}
          const imageUrl = propertyImageUrl(property)
          const title = rentalProperty.name || property.title || 'Rental property'

          return (
            <article key={item.rental_id} className="group overflow-hidden rounded-3xl border border-line/80 bg-panel shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ink/[0.05]">
              <div className="relative h-52 overflow-hidden bg-canvas sm:h-60">
                <img
                  src={imageUrl}
                  alt={title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  onError={(event) => { event.currentTarget.src = '/assets/property-placeholder.svg' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-emerald-600/95 px-3 py-1.5 text-xs font-semibold capitalize text-white shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />{item.status || 'Active'} tenancy
                </span>
                <div className="absolute inset-x-4 bottom-4 text-white">
                  <h2 className="truncate text-xl font-bold drop-shadow sm:text-2xl">{title}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
                    <MapPin size={15} />{rentalProperty.location || property.location || 'Location unavailable'}
                  </p>
                </div>
              </div>

              <div className="space-y-5 p-4 sm:p-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-canvas p-3.5">
                    <p className="text-xs font-medium text-muted">Rental amount</p>
                    <p className="mt-1.5 truncate text-base font-bold tabular-nums text-ink">{formatMoney(item.rental_amount)}</p>
                    <p className="mt-0.5 text-xs text-muted">{frequencyLabel(item.rental_frequency)}</p>
                  </div>
                  <div className="rounded-2xl bg-canvas p-3.5">
                    <p className="text-xs font-medium text-muted">Tenant</p>
                    <p className="mt-2 flex items-center gap-2 truncate text-sm font-semibold text-ink"><UserRound size={15} className="shrink-0 text-brand" />{item.tenant?.full_name || 'Tenant'}</p>
                  </div>
                </div>

                <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                  <div className="flex items-start gap-2.5">
                    <CalendarDays size={16} className="mt-0.5 shrink-0 text-brand" />
                    <div><p className="text-xs font-medium text-muted">Lease starts</p><p className="mt-1 text-sm font-semibold text-ink">{dateLabel(item.lease_start_date)}</p></div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Clock3 size={16} className="mt-0.5 shrink-0 text-brand" />
                    <div><p className="text-xs font-medium text-muted">Lease ends</p><p className="mt-1 text-sm font-semibold text-ink">{dateLabel(item.lease_end_date)}</p></div>
                  </div>
                </div>

                {rentalProperty.description ? <p className="border-t border-line pt-4 text-sm leading-6 text-muted">{rentalProperty.description}</p> : null}
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
