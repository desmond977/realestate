import { CalendarDays, ChevronLeft, ChevronRight, CreditCard, Loader2, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { formatMoney } from '../utils/formatters'

const statuses = ['due', 'partial', 'overdue', 'paid']

function getApiError(error) {
  return error.response?.data?.message || 'Unable to load rental payments.'
}

function formatDate(value) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString() : '—'
}

function PaymentStatus({ status }) {
  const styles = {
    due: 'border-blue-200 bg-blue-50 text-blue-700',
    partial: 'border-amber-200 bg-amber-50 text-amber-700',
    overdue: 'border-red-200 bg-red-50 text-red-700',
    paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }

  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold capitalize ${styles[status] || styles.due}`}>{status}</span>
}

export function RentalPaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rentalId = searchParams.get('rental_id') || ''
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ key: '', data: [], meta: null, error: '' })
  const requestKey = `${rentalId}|${search}|${status}|${page}`

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      api.get('/rental-payment-periods', {
        params: {
          rental_id: rentalId || undefined,
          search: search.trim() || undefined,
          status: status || undefined,
          page,
          per_page: 20,
        },
      })
        .then((response) => {
          if (active) {
            setResult({
              key: requestKey,
              data: response.data.data,
              meta: response.data.meta,
              error: '',
            })
          }
        })
        .catch((error) => {
          if (active) setResult({ key: requestKey, data: [], meta: null, error: getApiError(error) })
        })
    }, 200)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [page, rentalId, requestKey, search, status])

  const loading = result.key !== requestKey
  const periods = loading ? [] : result.data
  const meta = loading ? null : result.meta
  const error = loading ? '' : result.error

  function updateSearch(value) {
    setSearch(value)
    setPage(1)
  }

  function updateStatus(value) {
    setStatus(value)
    setPage(1)
  }

  function clearRentalFilter() {
    setSearchParams({})
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand">Rental management</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">Rental payments</h2>
          <p className="mt-1 text-sm text-muted">Track scheduled rent, part-payments, balances, and overdue periods.</p>
        </div>
        {rentalId ? <button type="button" onClick={clearRentalFilter} className="self-start text-sm font-medium text-brand hover:underline">Show all rentals</button> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="relative block">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="w-full rounded-md border border-line bg-panel py-2.5 pl-10 pr-3 text-sm" placeholder="Search property, tenant, email, or phone" value={search} onChange={(event) => updateSearch(event.target.value)} />
        </label>
        <select aria-label="Filter by payment status" className="rounded-md border border-line bg-panel px-3 py-2.5 text-sm capitalize" value={status} onChange={(event) => updateStatus(event.target.value)}>
          <option value="">All payment statuses</option>
          {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>

      {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted"><Loader2 size={18} className="animate-spin" />Loading rental payments</div>
      ) : periods.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-panel px-5 py-12 text-center">
          <CreditCard size={28} className="mx-auto text-muted" />
          <h3 className="mt-3 font-semibold text-ink">No payment periods found</h3>
          <p className="mt-1 text-sm text-muted">{search || status ? 'Try changing the search or status filter.' : 'Rental payment periods are generated from each lease frequency.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map((period) => {
            const agreement = period.rental_agreement
            return (
              <Link key={period.id} to={`/rental-payments/${period.id}`} className="block rounded-lg border border-line bg-panel p-4 shadow-sm transition hover:border-brand/40 hover:bg-brand/5 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-ink">{agreement?.rental_property?.name || 'Rental property'}</h3>
                    <p className="mt-1 text-sm text-muted">{agreement?.client?.full_name || 'Tenant'} · {agreement?.rental_frequency}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><CalendarDays size={14} />{formatDate(period.period_start)} – {formatDate(period.period_end)} · Due {formatDate(period.due_date)}</p>
                  </div>
                  <PaymentStatus status={period.status} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-sm">
                  <div><p className="text-xs text-muted">Amount due</p><p className="mt-1 font-semibold text-ink">{formatMoney(period.amount_due)}</p></div>
                  <div><p className="text-xs text-muted">Paid</p><p className="mt-1 font-semibold text-ink">{formatMoney(period.amount_paid)}</p></div>
                  <div><p className="text-xs text-muted">Balance</p><p className="mt-1 font-semibold text-ink">{formatMoney(period.balance)}</p></div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {!loading && meta?.last_page > 1 ? (
        <div className="flex items-center justify-between rounded-lg border border-line bg-panel px-4 py-3">
          <p className="text-sm text-muted">Page {meta.current_page} of {meta.last_page} · {meta.total} periods</p>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm disabled:opacity-50"><ChevronLeft size={16} />Previous</button>
            <button type="button" disabled={page >= meta.last_page} onClick={() => setPage((current) => current + 1)} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm disabled:opacity-50">Next<ChevronRight size={16} /></button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
