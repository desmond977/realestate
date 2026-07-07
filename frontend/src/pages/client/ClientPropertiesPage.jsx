import { useEffect, useState } from 'react'
import { propertyImageUrl } from '../../api/client'
import { propertiesApi } from '../../services/clientApi'
import { formatPaymentDuration } from '../../utils/paymentDuration'

const money = (value) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(value || 0))

const DEFAULT_PROPERTY_IMAGE = '/assets/property-placeholder.svg'

export function ClientPropertiesPage() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    propertiesApi
      .list()
      .then((response) => active && setProperties(response.data.properties || []))
      .catch(() => active && setError('Unable to load your properties.'))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Properties</h1>
        <p className="mt-1 text-sm text-muted">All allocations attached to your client account.</p>
      </div>

      {loading ? <div className="rounded-lg border border-line bg-panel p-6 text-sm text-muted">Loading properties...</div> : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div> : null}

      {!loading && !error && properties.length === 0 ? (
        <div className="rounded-lg border border-line bg-panel p-6 text-sm text-muted">No property allocations found.</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {properties.map((item) => {
          const property = item.property || {}
          const imageUrl = propertyImageUrl(property)

          return (
<article key={item.allocation_id} className="overflow-hidden rounded-lg border border-line bg-panel shadow-sm">
              <img src={imageUrl} alt={property.title || 'Property'} className="h-44 w-full object-cover" onError={(e) => { e.target.src = DEFAULT_PROPERTY_IMAGE }} />
              <div className="space-y-4 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">{property.title || 'Property'}</h2>
                    <p className="text-sm text-muted">{property.location || 'Location unavailable'}</p>
                  </div>
                  <span className="w-fit rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold capitalize text-brand">
                    {item.allocation_status?.value || item.allocation_status || 'active'}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted">Total</p>
                    <p className="font-semibold">{money(item.total_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Paid</p>
                    <p className="font-semibold">{money(item.paid_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Balance</p>
                    <p className="font-semibold">{money(item.outstanding_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Duration</p>
                    <p className="font-semibold">{formatPaymentDuration(item)}</p>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-canvas">
                  <div className="h-full bg-brand" style={{ width: `${Math.min(item.payment_progress || 0, 100)}%` }} />
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
