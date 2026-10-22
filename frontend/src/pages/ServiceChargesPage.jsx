import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import {
  canManageServiceChargeCategories,
  canManageServiceCharges,
} from '../auth/permissions'
import { formatMoney } from '../utils/formatters'

const statuses = ['due', 'partial', 'overdue', 'paid']

const emptyForm = {
  category_id: '',
  rental_agreement_id: '',
  description: '',
  billing_period_start: '',
  billing_period_end: '',
  billing_date: '',
  due_date: '',
  amount_due: '',
  notes: '',
}

function getApiError(error, fallback) {
  const errors = error.response?.data?.errors
  if (errors) return Object.values(errors).flat().join(' ')
  return error.response?.data?.message || fallback
}

function formatDate(value) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString() : '—'
}

function StatusBadge({ status }) {
  const styles = {
    due: 'border-blue-200 bg-blue-50 text-blue-700',
    partial: 'border-amber-200 bg-amber-50 text-amber-700',
    overdue: 'border-red-200 bg-red-50 text-red-700',
    paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }

  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold capitalize ${styles[status] || styles.due}`}>{status}</span>
}

function ChargeForm({ initialValues, categories, rentals, mode, submitting, error, onClose, onSubmit }) {
  const [form, setForm] = useState(initialValues)

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateRental(rentalId) {
    const rental = rentals.find((item) => String(item.id) === rentalId)
    setForm((current) => ({
      ...current,
      rental_agreement_id: rentalId,
      billing_period_start: rental?.lease_start_date || current.billing_period_start,
      billing_period_end: rental?.lease_end_date || current.billing_period_end,
      billing_date: rental?.lease_start_date || current.billing_date,
      due_date: rental?.lease_start_date || current.due_date,
    }))
  }

  function submit(event) {
    event.preventDefault()
    onSubmit({ ...form, category_id: Number(form.category_id), rental_agreement_id: Number(form.rental_agreement_id), amount_due: Number(form.amount_due) })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 px-0 py-0 backdrop-blur-sm sm:px-4 sm:py-6">
      <div className="mx-auto min-h-screen w-full max-w-3xl border border-line bg-panel shadow-2xl sm:min-h-0 sm:rounded-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-panel px-4 py-4 sm:px-5">
          <div>
            <h3 className="text-lg font-semibold text-ink">{mode === 'create' ? 'Create service charge' : 'Edit service charge'}</h3>
            <p className="text-sm text-muted">Assign a category and billing period to an active tenancy.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close service charge form" className="rounded-md p-2 text-muted hover:bg-canvas"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-4 sm:p-5">
          {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <label className="block">
            <span className="text-sm font-medium text-ink">Category</span>
            <select required value={form.category_id} onChange={(event) => update('category_id', event.target.value)} className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm">
              <option value="">Select a service charge category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Tenancy / tenant / property</span>
            <select required value={form.rental_agreement_id} onChange={(event) => updateRental(event.target.value)} className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm">
              <option value="">Select an active tenancy</option>
              {rentals.map((rental) => <option key={rental.id} value={rental.id}>#{rental.id} · {rental.property_name} · {rental.client_name}</option>)}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-ink">Description (optional)</span>
              <input maxLength={255} value={form.description} onChange={(event) => update('description', event.target.value)} className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" placeholder="e.g. Q4 security coverage" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Billing period start</span>
              <input required type="date" value={form.billing_period_start} onChange={(event) => update('billing_period_start', event.target.value)} className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Billing period end</span>
              <input required min={form.billing_period_start || undefined} type="date" value={form.billing_period_end} onChange={(event) => update('billing_period_end', event.target.value)} className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Billing date</span>
              <input required type="date" value={form.billing_date} onChange={(event) => update('billing_date', event.target.value)} className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Due date</span>
              <input required min={form.billing_date || undefined} type="date" value={form.due_date} onChange={(event) => update('due_date', event.target.value)} className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-ink">Amount due</span>
              <input required min="0.01" step="0.01" type="number" value={form.amount_due} onChange={(event) => update('amount_due', event.target.value)} className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-ink">Internal notes (optional)</span>
              <textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-md border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-canvas">Cancel</button>
            <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === 'create' ? 'Create charge' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CategoryForm({ onClose, onSubmit, submitting, error }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  function submit(event) {
    event.preventDefault()
    onSubmit({ name, description: description || null })
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 px-4 py-6">
      <form onSubmit={submit} className="w-full max-w-lg space-y-4 rounded-lg border border-line bg-panel p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ink">Add a charge category</h3>
          <button type="button" onClick={onClose} aria-label="Close category form" className="rounded-md p-2 text-muted hover:bg-canvas"><X size={18} /></button>
        </div>
        {error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <label className="block"><span className="text-sm font-medium text-ink">Category name</span><input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" /></label>
        <label className="block"><span className="text-sm font-medium text-ink">Description</span><input maxLength={255} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" /></label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-line px-3 py-2 text-sm text-muted">Cancel</button>
          <button disabled={submitting} className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Add category</button>
        </div>
      </form>
    </div>
  )
}

function chargeToForm(charge) {
  return {
    category_id: String(charge.category?.id || ''),
    rental_agreement_id: String(charge.rental_agreement?.id || ''),
    description: charge.description || '',
    billing_period_start: charge.billing_period_start || '',
    billing_period_end: charge.billing_period_end || '',
    billing_date: charge.billing_date || '',
    due_date: charge.due_date || '',
    amount_due: String(charge.amount_due || ''),
    notes: charge.notes || '',
  }
}

export function ServiceChargesPage() {
  const { user } = useAuth()
  const canManage = canManageServiceCharges(user)
  const canManageCategories = canManageServiceChargeCategories(user)
  const [searchParams, setSearchParams] = useSearchParams()
  const [charges, setCharges] = useState([])
  const [categories, setCategories] = useState([])
  const [rentals, setRentals] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [editingCharge, setEditingCharge] = useState(null)
  const [formError, setFormError] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadOptions = useCallback(async () => {
    const [optionsResponse, categoryResponse] = await Promise.all([
      api.get('/service-charges/form-options'),
      api.get('/service-charge-categories'),
    ])
    setRentals(optionsResponse.data.data.rentals)
    setCategories(categoryResponse.data.data.categories)
  }, [])

  const loadCharges = useCallback(async () => {
    setLoading(true)
    setPageError('')
    try {
      const response = await api.get('/service-charges', {
        params: {
          search: search.trim() || undefined,
          category_id: categoryId || undefined,
          status: status || undefined,
          per_page: 20,
          page,
        },
      })
      setCharges(response.data.data)
      setMeta(response.data.meta)
    } catch (error) {
      setPageError(getApiError(error, 'Unable to load service charges.'))
    } finally {
      setLoading(false)
    }
  }, [categoryId, page, search, status])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadOptions().catch((error) => setPageError(getApiError(error, 'Unable to load charge form options.')))
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadOptions])

  useEffect(() => {
    const timer = window.setTimeout(loadCharges, 200)
    return () => window.clearTimeout(timer)
  }, [loadCharges])

  useEffect(() => {
    const editId = searchParams.get('edit')
    if (!editId || !canManage) return

    api.get(`/service-charges/${editId}`)
      .then((response) => {
        setEditingCharge(response.data.data.service_charge)
        setFormError('')
        setFormOpen(true)
      })
      .catch((error) => setPageError(getApiError(error, 'Unable to load service charge for editing.')))
      .finally(() => setSearchParams({}, { replace: true }))
  }, [canManage, searchParams, setSearchParams])

  function openCreate() {
    setEditingCharge(null)
    setFormError('')
    setFormOpen(true)
  }

  async function saveCharge(payload) {
    setSubmitting(true)
    setFormError('')
    try {
      if (editingCharge) await api.put(`/service-charges/${editingCharge.id}`, payload)
      else await api.post('/service-charges', payload)
      setFormOpen(false)
      setEditingCharge(null)
      await loadCharges()
    } catch (error) {
      setFormError(getApiError(error, 'Unable to save service charge.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function createCategory(payload) {
    setSubmitting(true)
    setCategoryError('')
    try {
      await api.post('/service-charge-categories', payload)
      await loadOptions()
      setCategoryFormOpen(false)
    } catch (error) {
      setCategoryError(getApiError(error, 'Unable to create category.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteCharge(charge) {
    if (!window.confirm(`Delete the ${charge.category?.name || 'service'} charge for ${charge.client?.full_name || 'this tenant'}?`)) return
    try {
      await api.delete(`/service-charges/${charge.id}`)
      await loadCharges()
    } catch (error) {
      setPageError(getApiError(error, 'Unable to delete service charge.'))
    }
  }

  function updateFilter(setter, value) {
    setter(value)
    setPage(1)
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand">Property operations</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">Service charges</h2>
          <p className="mt-1 text-sm text-muted">Track tenant service-charge liabilities and collections separately from rent.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageCategories ? <button type="button" onClick={() => { setCategoryError(''); setCategoryFormOpen(true) }} className="rounded-md border border-line px-3 py-2.5 text-sm font-semibold text-ink hover:bg-canvas">Manage categories</button> : null}
          {canManage ? <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17} />Create charge</button> : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_200px_180px]">
        <label className="relative block">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(event) => updateFilter(setSearch, event.target.value)} placeholder="Search tenant, property, category" className="w-full rounded-md border border-line bg-panel py-2.5 pl-10 pr-3 text-sm" />
        </label>
        <select aria-label="Filter by category" value={categoryId} onChange={(event) => updateFilter(setCategoryId, event.target.value)} className="rounded-md border border-line bg-panel px-3 py-2.5 text-sm">
          <option value="">All categories</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select aria-label="Filter by payment status" value={status} onChange={(event) => updateFilter(setStatus, event.target.value)} className="rounded-md border border-line bg-panel px-3 py-2.5 text-sm capitalize">
          <option value="">All statuses</option>
          {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>

      {pageError ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</p> : null}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted"><Loader2 size={18} className="animate-spin" />Loading service charges</div>
      ) : charges.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-panel px-5 py-12 text-center">
          <h3 className="font-semibold text-ink">No service charges found</h3>
          <p className="mt-1 text-sm text-muted">{search || status || categoryId ? 'Try changing the filters.' : 'Create a charge for an active rental tenancy to get started.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {charges.map((charge) => (
            <article key={charge.id} className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link to={`/service-charges/${charge.id}`} className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">{charge.category?.name || 'Service charge'}</p>
                  <h3 className="mt-1 truncate font-semibold text-ink">{charge.rental_property?.name || 'Rental property'} · {charge.client?.full_name || 'Tenant'}</h3>
                  <p className="mt-1 text-sm text-muted">{charge.description || 'Service charge'} · {formatDate(charge.billing_period_start)} – {formatDate(charge.billing_period_end)}</p>
                </Link>
                <StatusBadge status={charge.status} />
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="grid grid-cols-3 gap-x-5 gap-y-2 text-sm">
                  <div><p className="text-xs text-muted">Due</p><p className="mt-1 font-semibold text-ink">{formatMoney(charge.amount_due)}</p></div>
                  <div><p className="text-xs text-muted">Paid</p><p className="mt-1 font-semibold text-ink">{formatMoney(charge.amount_paid)}</p></div>
                  <div><p className="text-xs text-muted">Balance</p><p className="mt-1 font-semibold text-ink">{formatMoney(charge.balance)}</p></div>
                </div>
                {canManage ? (
                  <div className="flex gap-2">
                    <button type="button" disabled={charge.amount_paid > 0} onClick={() => { setEditingCharge(charge); setFormError(''); setFormOpen(true) }} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium text-muted hover:bg-canvas disabled:opacity-50"><Edit3 size={14} />Edit</button>
                    {user?.role === 'admin' ? <button type="button" onClick={() => deleteCharge(charge)} className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"><Trash2 size={14} />Delete</button> : null}
                  </div>
                ) : null}
              </div>
              <p className="mt-3 text-xs text-muted">Billed {formatDate(charge.billing_date)} · Due {formatDate(charge.due_date)}</p>
            </article>
          ))}
        </div>
      )}

      {!loading && meta.last_page > 1 ? (
        <div className="flex items-center justify-between rounded-lg border border-line bg-panel px-4 py-3">
          <p className="text-sm text-muted">Page {meta.current_page} of {meta.last_page} · {meta.total} charges</p>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm disabled:opacity-50"><ChevronLeft size={16} />Previous</button>
            <button type="button" disabled={page >= meta.last_page} onClick={() => setPage((current) => current + 1)} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm disabled:opacity-50">Next<ChevronRight size={16} /></button>
          </div>
        </div>
      ) : null}

      {formOpen ? <ChargeForm key={editingCharge?.id || 'new-charge'} initialValues={editingCharge ? chargeToForm(editingCharge) : emptyForm} categories={categories} rentals={rentals} mode={editingCharge ? 'edit' : 'create'} submitting={submitting} error={formError} onClose={() => setFormOpen(false)} onSubmit={saveCharge} /> : null}
      {categoryFormOpen ? <CategoryForm onClose={() => setCategoryFormOpen(false)} onSubmit={createCategory} submitting={submitting} error={categoryError} /> : null}
    </section>
  )
}
