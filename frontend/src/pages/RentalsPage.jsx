import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { canManageRentals } from '../auth/permissions'
import { formatMoney } from '../utils/formatters'

const statuses = ['active', 'expired', 'terminated']
const frequencies = ['annually']

const emptyForm = {
  property_id: '',
  property_name: '',
  property_location: '',
  property_description: '',
  client_id: '',
  rental_amount: '',
  rental_frequency: 'annually',
  lease_start_date: '',
  lease_end_date: '',
  status: 'active',
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

function frequencyLabel(frequency) {
  return frequency === 'annually' ? 'Yearly' : frequency
}

function StatusBadge({ status }) {
  const styles = {
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    expired: 'border-slate-200 bg-slate-100 text-slate-700',
    terminated: 'border-red-200 bg-red-50 text-red-700',
  }

  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold capitalize ${styles[status] || styles.active}`}>
      {status}
    </span>
  )
}

function RentalFormModal({ initialValues, mode, clients, properties, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState(initialValues)

  function updateField(field, value) {
    setForm((current) => {
      if (field !== 'lease_start_date' || mode !== 'create' || !value) {
        return { ...current, [field]: value }
      }

      const [year, month, day] = value.split('-').map(Number)
      const endOfTargetMonth = new Date(Date.UTC(year + 1, month, 0)).getUTCDate()
      const leaseEndDate = `${year + 1}-${String(month).padStart(2, '0')}-${String(Math.min(day, endOfTargetMonth)).padStart(2, '0')}`

      return { ...current, lease_start_date: value, lease_end_date: leaseEndDate }
    })
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({
      ...form,
      property_id: Number(form.property_id),
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
              <span className="text-sm font-medium text-ink">Select an existing property</span>
              <select required className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" value={form.property_id} onChange={(event) => updateField('property_id', event.target.value)}>
                <option value="">Select a property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title} — {property.location}
                  </option>
                ))}
              </select>
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
                  {frequencies.map((frequency) => <option key={frequency} value={frequency}>Yearly</option>)}
                  {!frequencies.includes(form.rental_frequency) ? <option value={form.rental_frequency} disabled>{frequencyLabel(form.rental_frequency)} (existing)</option> : null}
                </select>
              </label>
              {mode === 'edit' ? <label className="block">
                <span className="text-sm font-medium text-ink">Status</span>
                <select className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm capitalize" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label> : null}
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
            <button disabled={submitting} type="submit" className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {submitting ? (mode === 'create' ? 'Creating...' : 'Saving...') : (mode === 'create' ? 'Create rental' : 'Save changes')}
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
    rental_frequency: rental.rental_frequency || 'annually',
    lease_start_date: rental.lease_start_date || '',
    lease_end_date: rental.lease_end_date || '',
    status: statuses.includes(rental.status) ? rental.status : 'active',
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
  const saveInProgress = useRef(false)

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
    if (saveInProgress.current) return

    saveInProgress.current = true
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
      saveInProgress.current = false
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
        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          <div className="hidden items-center gap-4 border-b border-line bg-canvas px-4 py-3 text-xs font-semibold uppercase text-muted lg:flex">
            <span className="min-w-0 flex-[2]">Property / tenant</span>
            <span className="min-w-0 flex-[1.4]">Lease term</span>
            <span className="min-w-0 flex-1">Rent</span>
            <span className="w-24">Status</span>
            <span className="w-52 text-right">Actions</span>
          </div>
          {rentals.map((rental) => (
            <article key={rental.id} className="mb-2 flex flex-col gap-3 border-b border-line bg-white px-4 py-3 odd:bg-white even:bg-[#f8faf7] last:border-b-0 hover:bg-canvas/70 lg:mb-0 lg:flex-row lg:items-center lg:gap-4">
              <Link to={`/rentals/${rental.id}`} className="flex min-w-0 flex-[2] items-start gap-2.5">
                <Building2 size={17} className="mt-0.5 shrink-0 text-brand" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{rental.rental_property?.name || rental.rental_property?.property?.title || 'Rental property'}</span>
                  <span className="mt-0.5 block truncate text-sm text-muted">{rental.client?.full_name || 'Unknown client'}</span>
                </span>
              </Link>
              <div className="min-w-0 flex-[1.4] pl-[27px] text-sm text-muted sm:pl-0">
                <span className="lg:hidden">Lease · </span>{formatDate(rental.lease_start_date)} – {formatDate(rental.lease_end_date)}
              </div>
              <div className="min-w-0 flex-1 pl-[27px] text-sm font-semibold text-ink sm:pl-0">
                <span>{formatMoney(rental.rental_amount)}</span>
                <span className="ml-1 text-xs font-normal capitalize text-muted">/ {frequencyLabel(rental.rental_frequency)}</span>
              </div>
              <div className="pl-[27px] sm:pl-0 lg:w-24"><StatusBadge status={rental.status} /></div>
              <div className="flex flex-wrap gap-2 pl-[27px] sm:pl-0 lg:w-52 lg:justify-end">
                <Link to={`/rentals/${rental.id}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-canvas"><Eye size={14} />Details</Link>
                {canManage ? (
                  <>
                    <button type="button" onClick={() => openEditForm(rental)} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-canvas"><Edit3 size={14} />Edit</button>
                    <button type="button" onClick={() => deleteRental(rental)} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"><Trash2 size={14} />Delete</button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && meta.last_page > 1 ? (
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">Page {meta.current_page} of {meta.last_page} · {meta.total} rentals</p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-line px-3 py-2 text-sm disabled:opacity-50"><ChevronLeft size={16} />Previous</button>
            <button type="button" disabled={page >= meta.last_page} onClick={() => setPage((current) => current + 1)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-line px-3 py-2 text-sm disabled:opacity-50">Next<ChevronRight size={16} /></button>
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
