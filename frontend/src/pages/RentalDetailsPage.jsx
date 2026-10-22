import { ArrowLeft, Building2, CalendarDays, CreditCard, Edit3, Loader2, MapPin, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { canManageRentals } from '../auth/permissions'
import { formatMoney } from '../utils/formatters'

function getApiError(error) {
  return error.response?.data?.message || 'Unable to load rental details.'
}

function formatDate(value) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString() : '—'
}

function Detail({ label, value, icon: Icon }) {
  return (
    <div className="rounded-md bg-canvas p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">{Icon ? <Icon size={14} /> : null}{label}</p>
      <p className="mt-2 break-words text-sm font-medium text-ink">{value || 'Not specified'}</p>
    </div>
  )
}

export function RentalDetailsPage() {
  const { rentalId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [result, setResult] = useState({ id: null, rental: null, error: '' })

  useEffect(() => {
    let active = true
    api.get(`/rentals/${rentalId}`)
      .then((response) => {
        if (active) setResult({ id: rentalId, rental: response.data.data.rental, error: '' })
      })
      .catch((requestError) => {
        if (active) setResult({ id: rentalId, rental: null, error: getApiError(requestError) })
      })

    return () => { active = false }
  }, [rentalId])

  if (result.id !== rentalId) {
    return <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted"><Loader2 size={18} className="animate-spin" />Loading rental details</div>
  }

  const rental = result.rental

  if (result.error || !rental) {
    return (
      <section className="space-y-4">
        <Link to="/rentals" className="inline-flex items-center gap-2 text-sm font-medium text-brand"><ArrowLeft size={16} />Back to rentals</Link>
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{result.error || 'Rental not found.'}</p>
      </section>
    )
  }

  const rentalProperty = rental.rental_property
  const property = rentalProperty?.property

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/rentals" className="inline-flex items-center gap-2 text-sm font-medium text-brand"><ArrowLeft size={16} />Back to rentals</Link>
        <div className="flex gap-2">
          <Link to={`/rental-payments?rental_id=${rental.id}`} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink hover:bg-canvas"><CreditCard size={16} />Payment history</Link>
          {canManageRentals(user) ? (
          <button type="button" onClick={() => navigate(`/rentals?edit=${rental.id}`)} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink hover:bg-canvas"><Edit3 size={16} />Edit rental</button>
          ) : null}
        </div>
      </div>

      <header className="rounded-lg border border-line bg-panel p-5 shadow-sm sm:p-6">
        <p className="text-sm font-medium text-brand">Rental agreement #{rental.id}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-ink">{rentalProperty?.name || property?.title || 'Rental property'}</h2>
          <span className="inline-flex rounded-md border border-line bg-canvas px-2.5 py-1 text-sm font-semibold capitalize text-ink">{rental.status}</span>
        </div>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted"><MapPin size={15} />{rentalProperty?.location || property?.location || 'Location not specified'}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-panel p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-ink"><Building2 size={18} className="text-brand" />Property information</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Property / unit" value={rentalProperty?.name || property?.title} />
            <Detail label="Property type" value={property?.type} />
            <Detail label="Location" value={rentalProperty?.location || property?.location} />
            <Detail label="Linked sales property" value={property ? property.title : 'Standalone rental property'} />
          </div>
          {rentalProperty?.description ? <p className="mt-4 whitespace-pre-wrap text-sm text-muted">{rentalProperty.description}</p> : null}
        </section>

        <section className="rounded-lg border border-line bg-panel p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-ink"><UserRound size={18} className="text-brand" />Tenant / client</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Name" value={rental.client?.full_name} />
            <Detail label="Email" value={rental.client?.email} />
            <Detail label="Phone" value={rental.client?.phone} />
            <Detail label="Address" value={rental.client?.address} />
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-line bg-panel p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-ink"><CalendarDays size={18} className="text-brand" />Lease terms</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Rental amount" value={`${formatMoney(rental.rental_amount)} / ${rental.rental_frequency}`} />
          <Detail label="Frequency" value={rental.rental_frequency} />
          <Detail label="Lease start" value={formatDate(rental.lease_start_date)} />
          <Detail label="Lease end" value={formatDate(rental.lease_end_date)} />
        </div>
        {rental.notes ? <div className="mt-4 rounded-md bg-canvas p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Agreement notes</p><p className="mt-2 whitespace-pre-wrap text-sm text-ink">{rental.notes}</p></div> : null}
      </section>
    </section>
  )
}
