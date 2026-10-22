import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { canManageRentals } from '../auth/permissions'
import { formatMoney } from '../utils/formatters'

const statuses = ['pending', 'active', 'expired', 'terminated']
const frequencies = ['weekly', 'biweekly', 'monthly', 'quarterly', 'annually']

const emptyForm = {
  property_id: '',
  property_name: '',
  property_location: '',
  property_description: '',
  client_id: '',
  rental_amount: '',
  rental_frequency: 'monthly',
  lease_start_date: '',
  lease_end_date: '',
  status: 'pending',
  notes: '',
}

function getApiError(error, fallback) {
  const errors = error.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  return error.response?.data?.message || fallback
}

function formatDate(value) {
  if (!value) return '—'

  return new Date(`${value}T00:00:00`).toLocaleDateString()
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    expired: 'border-slate-200 bg-slate-100 text-slate-700',
    terminated: 'border-red-200 bg-red-50 text-red-700',
  }

  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold capitalize ${styles[status] || styles.pending}`}>
      {status}
    </span>
  )
}

function RentalFormModal({ initialValues, mode, clients, properties, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState(initialValues)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({
      ...form,
      property_id: form.property_id || null,
      client_id: Number(form.client_id),
      rental_amount: Number(form.rental_amount),
    })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 px-0 py-0 backdrop-blur-sm sm:px-4 sm:py-6">
      <div className="mx-auto min-h-screen w-full max-w-3xl border border-line bg-panel shadow-2xl sm:min-h-0 sm:rounded-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-panel px-4 py-4 sm:px-5">
          <div>
            <h3 className="text-lg font-semibold text-ink">{mode === 'create' ? 'Add rental' : 'Edit rental'}</h3>
            <p className="text-sm text-muted">Record the property, tenant, and lease terms.</p>
          </div>
          <button type="button" className="rounded-md p-2 text-muted hover:bg-canvas" onClick={onClose} aria-label="Close rental form">
            <X size={20} />
          </button>
        </div>

        <form className="space-y-5 p-4 sm:p-5" onSubmit={handleSubmit}>
          {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <section className="space-y-4">
            <h4 className="text-sm font-semibold text-ink">Rental property</h4>
            <label className="block">
              <span className="text-sm font-medium text-ink">Link an existing property (optional)</span>
              <select className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" value={form.property_id} onChange={(event) => updateField('property_id', event.target.value)}>
                <option value="">Enter rental property details below</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title} — {property.location}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-ink">Rental property / unit name</span>
                <input className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" value={form.property_name} onChange={(event) => updateField('property_name', event.target.value)} placeholder="Required when no existing property is selected" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Location</span>
                <input className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" value={form.property_location} onChange={(event) => updateField('property_location', event.target.value)} placeholder="Required when no existing property is selected" />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-ink">Property notes</span>
              <textarea className="mt-1 min-h-20 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" value={form.property_description} onChange={(event) => updateField('property_description', event.target.value)} />
            </label>
          </section>

          <section className="space-y-4 border-t border-line pt-5">
            <h4 className="text-sm font-semibold text-ink">Tenant and lease</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-ink">Tenant / client</span>
                <select required className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" value={form.client_id} onChange={(event) => updateField('client_id', event.target.value)}>
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.first_name} {client.last_name}{client.email ? ` — ${client.email}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Rental amount</span>
                <input required min="0.01" step="0.01" type="number" className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" value={form.rental_amount} onChange={(event) => updateField('rental_amount', event.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Rental frequency</span>
                <select className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm capitalize" value={form.rental_frequency} onChange={(event) => updateField('rental_frequency', event.target.value)}>
                  {frequencies.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Status</span>
                <select className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm capitalize" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Lease start date</span>
                <input required type="date" className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" value={form.lease_start_date} onChange={(event) => updateField('lease_start_date', event.target.value)} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Lease end date</span>
                <input required min={form.lease_start_date || undefined} type="date" className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" value={form.lease_end_date} onChange={(event) => updateField('lease_end_date', event.target.value)} />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-ink">Agreement notes</span>
              <textarea className="mt-1 min-h-20 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" value={form.notes} onChange={(event) => updateField('notes', event.target.value)} />
            </label>
          </section>

          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <button type="button" className="rounded-md border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-canvas" onClick={onClose}>Cancel</button>
            <button disabled={submitting} type="submit" className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === 'create' ? 'Create rental' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function rentalToForm(rental) {
  return {
    property_id: rental.rental_property?.property_id ? String(rental.rental_property.property_id) : '',
    property_name: rental.rental_property?.name || '',
    property_location: rental.rental_property?.location || '',
    property_description: rental.rental_property?.description || '',
    client_id: rental.client?.id ? String(rental.client.id) : '',
    rental_amount: String(rental.rental_amount ?? ''),
    rental_frequency: rental.rental_frequency || 'monthly',
    lease_start_date: rental.lease_start_date || '',
    lease_end_date: rental.lease_end_date || '',
    status: rental.status || 'pending',
    notes: rental.notes || '',
  }
}

export function RentalsPage() {
  const { user } = useAuth()
  const canManage = canManageRentals(user)
  const [searchParams, setSearchParams] = useSearchParams()
  const [rentals, setRentals] = useState([])
  const [clients, setClients] = useState([])
  const [properties, setProperties] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingRental, setEditingRental] = useState(null)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadRentals = useCallback(async () => {
    setLoading(true)
    setPageError('')

    try {
      const response = await api.get('/rentals', {
        params: {
          search: search.trim() || undefined,
          status: status || undefined,
          per_page: 15,
          page,
        },
      })
      setRentals(response.data.data)
      setMeta(response.data.meta)
    } catch (error) {
      setPageError(getApiError(error, 'Unable to load rentals.'))
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => {
    const timer = window.setTimeout(loadRentals, 250)
    return () => window.clearTimeout(timer)
  }, [loadRentals])

  useEffect(() => {
    if (!canManage) return

    let active = true
    api.get('/rentals/form-options')
      .then((response) => {
        if (active) {
          setClients(response.data.data.clients)
          setProperties(response.data.data.properties)
        }
      })
      .catch((error) => {
        if (active) setPageError(getApiError(error, 'Unable to load rental form options.'))
      })

    return () => { active = false }
  }, [canManage])

  useEffect(() => {
    const editId = searchParams.get('edit')
    if (!editId) return

    api.get(`/rentals/${editId}`)
      .then((response) => {
        setEditingRental(response.data.data.rental)
        setFormError('')
        setFormOpen(true)
      })
      .catch((error) => setPageError(getApiError(error, 'Unable to load the rental for editing.')))
      .finally(() => setSearchParams({}, { replace: true }))
  }, [searchParams, setSearchParams])

  function openCreateForm() {
    setEditingRental(null)
    setFormError('')
    setFormOpen(true)
  }

  function openEditForm(rental) {
    setEditingRental(rental)
    setFormError('')
    setFormOpen(true)
  }

  async function saveRental(data) {
    setSubmitting(true)
    setFormError('')

    try {
      if (editingRental) {
        await api.put(`/rentals/${editingRental.id}`, data)
      } else {
        await api.post('/rentals', data)
      }

      setFormOpen(false)
      setEditingRental(null)
      await loadRentals()
    } catch (error) {
      setFormError(getApiError(error, 'Unable to save the rental.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteRental(rental) {
    if (!window.confirm(`Delete the rental agreement for ${rental.client?.full_name || 'this client'}?`)) return

    try {
      await api.delete(`/rentals/${rental.id}`)
      await loadRentals()
    } catch (error) {
      setPageError(getApiError(error, 'Unable to delete the rental.'))
    }
  }

  function updateSearch(value) {
    setSearch(value)
    setPage(1)
  }

  function updateStatus(value) {
    setStatus(value)
    setPage(1)
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand">Rental management</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">Rentals</h2>
          <p className="mt-1 text-sm text-muted">Manage rental properties, tenants, and lease terms.</p>
        </div>
        {canManage ? (
          <button type="button" onClick={openCreateForm} className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm">
            <Plus size={17} />
            Add rental
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="relative block">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="w-full rounded-md border border-line bg-panel py-2.5 pl-10 pr-3 text-sm" placeholder="Search property, tenant, email, or phone" value={search} onChange={(event) => updateSearch(event.target.value)} />
        </label>
        <select aria-label="Filter by rental status" className="rounded-md border border-line bg-panel px-3 py-2.5 text-sm capitalize" value={status} onChange={(event) => updateStatus(event.target.value)}>
          <option value="">All statuses</option>
          {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>

      {pageError ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</p> : null}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted"><Loader2 size={18} className="animate-spin" />Loading rentals</div>
      ) : rentals.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-panel px-5 py-12 text-center">
          <Building2 size={28} className="mx-auto text-muted" />
          <h3 className="mt-3 font-semibold text-ink">No rentals found</h3>
          <p className="mt-1 text-sm text-muted">{search || status ? 'Try changing the search or status filter.' : 'Add a rental agreement to get started.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rentals.map((rental) => (
            <article key={rental.id} className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 size={17} className="shrink-0 text-brand" />
                    <h3 className="truncate font-semibold text-ink">{rental.rental_property?.name || rental.rental_property?.property?.title || 'Rental property'}</h3>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><MapPin size={14} />{rental.rental_property?.location || rental.rental_property?.property?.location || 'Location not specified'}</p>
                </div>
                <StatusBadge status={rental.status} />
              </div>
              <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                <div className="flex items-start gap-2.5">
                  <UserRound size={16} className="mt-0.5 shrink-0 text-muted" />
                  <div><p className="text-xs text-muted">Tenant</p><p className="text-sm font-medium text-ink">{rental.client?.full_name || 'Unknown client'}</p></div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CalendarDays size={16} className="mt-0.5 shrink-0 text-muted" />
                  <div><p className="text-xs text-muted">Lease dates</p><p className="text-sm font-medium text-ink">{formatDate(rental.lease_start_date)} – {formatDate(rental.lease_end_date)}</p></div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
                <div>
                  <p className="text-xs text-muted">Rental amount</p>
                  <p className="mt-0.5 font-semibold text-ink">{formatMoney(rental.rental_amount)} <span className="text-sm font-normal capitalize text-muted">/ {rental.rental_frequency}</span></p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/rentals/${rental.id}`} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium text-muted hover:bg-canvas"><Eye size={15} />Details</Link>
                  {canManage ? (
                    <>
                      <button type="button" onClick={() => openEditForm(rental)} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium text-muted hover:bg-canvas"><Edit3 size={15} />Edit</button>
                      <button type="button" onClick={() => deleteRental(rental)} className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"><Trash2 size={15} />Delete</button>
                    </>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && meta.last_page > 1 ? (
        <div className="flex items-center justify-between rounded-lg border border-line bg-panel px-4 py-3">
          <p className="text-sm text-muted">Page {meta.current_page} of {meta.last_page} · {meta.total} rentals</p>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm disabled:opacity-50"><ChevronLeft size={16} />Previous</button>
            <button type="button" disabled={page >= meta.last_page} onClick={() => setPage((current) => current + 1)} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm disabled:opacity-50">Next<ChevronRight size={16} /></button>
          </div>
        </div>
      ) : null}

      {formOpen ? (
        <RentalFormModal
          key={editingRental?.id || 'new-rental'}
          initialValues={editingRental ? rentalToForm(editingRental) : emptyForm}
          mode={editingRental ? 'edit' : 'create'}
          clients={clients}
          properties={properties}
          onClose={() => setFormOpen(false)}
          onSubmit={saveRental}
          submitting={submitting}
          error={formError}
        />
      ) : null}
    </section>
  )
}
