import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  Edit3,
  FileText,
  Loader2,
  Plus,
  ReceiptText,
  Search,
  Settings2,
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

const statuses = ['unpaid_pending', 'partial', 'non_payment', 'paid']

const currentBillingMonth = new Date().toISOString().slice(0, 7)
const [currentBillingYear, currentBillingMonthNumber] = currentBillingMonth.split('-').map(Number)
const currentBillingStart = `${currentBillingMonth}-01`
const currentBillingEnd = new Date(Date.UTC(currentBillingYear, currentBillingMonthNumber, 0)).toISOString().slice(0, 10)

const emptyForm = {
  category_id: '',
  rental_agreement_id: '',
  description: '',
  billing_month: currentBillingMonth,
  billing_period_start: currentBillingStart,
  billing_period_end: currentBillingEnd,
  billing_date: currentBillingStart,
  due_date: currentBillingStart,
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

function formatBillingMonth(value, fallbackDate) {
  const month = value || fallbackDate?.slice(0, 7)
  return month
    ? new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : '—'
}

function StatusBadge({ status }) {
  const styles = {
    due: 'border-blue-200 bg-blue-50 text-blue-700',
    unpaid_pending: 'border-blue-200 bg-blue-50 text-blue-700',
    non_payment: 'border-red-200 bg-red-50 text-red-700',
    partial: 'border-amber-200 bg-amber-50 text-amber-700',
    overdue: 'border-red-200 bg-red-50 text-red-700',
    paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }

  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold capitalize ${styles[status] || styles.due}`}>{status?.replaceAll('_', ' ')}</span>
}

function ChargeForm({ initialValues, categories, rentals, mode, submitting, error, onClose, onSubmit }) {
  const [form, setForm] = useState(initialValues)

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateBillingMonth(value) {
    if (!value) {
      setForm((current) => ({ ...current, billing_month: '' }))
      return
    }

    const [year, month] = value.split('-').map(Number)
    const start = `${value}-01`
    const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
    setForm((current) => ({
      ...current,
      billing_month: value,
      billing_period_start: start,
      billing_period_end: end,
      due_date: start,
      billing_date: current.billing_date && current.billing_date.slice(0, 7) === value ? current.billing_date : start,
    }))
  }

  function updateCategory(categoryId) {
    const category = categories.find((item) => String(item.id) === categoryId)
    setForm((current) => ({
      ...current,
      category_id: categoryId,
      amount_due: category?.monthly_amount ? String(category.monthly_amount) : current.amount_due,
    }))
  }

  function updateRental(rentalId) {
    setForm((current) => ({
      ...current,
      rental_agreement_id: rentalId,
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
        <form onSubmit={submit} className="space-y-5 p-4 sm:p-5">
          {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink">Category</span>
            <select required value={form.category_id} onChange={(event) => updateCategory(event.target.value)} className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm">
              <option value="">Select a service charge category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink">Tenancy / tenant / property</span>
            <select required value={form.rental_agreement_id} onChange={(event) => updateRental(event.target.value)} className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm">
              <option value="">Select an active tenancy</option>
              {rentals.map((rental) => <option key={rental.id} value={rental.id}>#{rental.id} · {rental.property_name} · {rental.client_name}</option>)}
            </select>
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-ink">Description (optional)</span>
              <input maxLength={255} value={form.description} onChange={(event) => update('description', event.target.value)} className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" placeholder="e.g. Q4 security coverage" />
            </label>
            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-ink">Billing month</span>
              <input required type="month" value={form.billing_month || ''} onChange={(event) => updateBillingMonth(event.target.value)} className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" />
              {form.billing_period_start && form.billing_period_end ? <span className="block text-xs text-muted">Period: {formatDate(form.billing_period_start)} – {formatDate(form.billing_period_end)}</span> : null}
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink">Billing date</span>
              <input required type="date" min={form.billing_period_start || undefined} max={form.billing_period_end || undefined} value={form.billing_date} onChange={(event) => update('billing_date', event.target.value)} className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink">Due date</span>
              <input type="date" value={form.due_date} readOnly className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-muted" />
              <span className="block text-xs text-muted">Due on the first of the billing month.</span>
            </label>
            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-ink">Amount due</span>
              <input required min="0.01" step="0.01" type="number" value={form.amount_due} onChange={(event) => update('amount_due', event.target.value)} className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" />
            </label>
            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-ink">Internal notes (optional)</span>
              <textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} className="min-h-20 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" />
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

function CategoryForm({ category, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState(() => ({
    name: category?.name || '',
    description: category?.description || '',
    monthly_amount: String(category?.monthly_amount || ''),
    is_active: category?.is_active ?? true,
  }))

  function submit(event) {
    event.preventDefault()
    onSubmit({ ...form, monthly_amount: Number(form.monthly_amount), description: form.description || null })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 px-3 py-3 sm:items-center sm:px-4 sm:py-6">
      <form onSubmit={submit} className="my-auto w-full max-w-lg space-y-5 rounded-lg border border-line bg-panel p-4 shadow-2xl sm:p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ink">{category ? 'Configure service charge' : 'Add a charge category'}</h3>
          <button type="button" onClick={onClose} aria-label="Close category form" className="rounded-md p-2 text-muted hover:bg-canvas"><X size={18} /></button>
        </div>
        {error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <label className="block space-y-2"><span className="text-sm font-medium text-ink">Category name</span><input required maxLength={100} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" /></label>
        <label className="block space-y-2"><span className="text-sm font-medium text-ink">Monthly amount</span><input required min="0.01" step="0.01" type="number" value={form.monthly_amount} onChange={(event) => setForm((current) => ({ ...current, monthly_amount: event.target.value }))} className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" /></label>
        <label className="block space-y-2"><span className="text-sm font-medium text-ink">Description</span><input maxLength={255} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" /></label>
        <label className="flex items-center gap-2 text-sm font-medium text-ink"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />Generate this category each month</label>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="min-h-11 rounded-md border border-line px-3 py-2 text-sm text-muted sm:min-h-0">Cancel</button>
          <button disabled={submitting} className="min-h-11 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:min-h-0">{category ? 'Save category' : 'Add category'}</button>
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
    billing_month: charge.billing_month || charge.billing_period_start?.slice(0, 7) || '',
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
  const [tenants, setTenants] = useState([])
  const [properties, setProperties] = useState([])
  const [monthlySummary, setMonthlySummary] = useState({ amount_billed: 0, amount_collected: 0, outstanding_balance: 0 })
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [tenantId, setTenantId] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
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
    setTenants(optionsResponse.data.data.tenants || [])
    setProperties(optionsResponse.data.data.properties || [])
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
          month,
          client_id: tenantId || undefined,
          property_id: propertyId || undefined,
          per_page: 20,
          page,
        },
      })
      setCharges(response.data.data)
      setMonthlySummary(response.data.summary || { amount_billed: 0, amount_collected: 0, outstanding_balance: 0 })
      setMeta(response.data.meta)
    } catch (error) {
      setPageError(getApiError(error, 'Unable to load service charges.'))
    } finally {
      setLoading(false)
    }
  }, [categoryId, month, page, propertyId, search, status, tenantId])

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

  async function saveCategory(payload) {
    setSubmitting(true)
    setCategoryError('')
    try {
      if (editingCategory) await api.put(`/service-charge-categories/${editingCategory.id}`, payload)
      else await api.post('/service-charge-categories', payload)
      await loadOptions()
      setCategoryFormOpen(false)
      setEditingCategory(null)
    } catch (error) {
      setCategoryError(getApiError(error, 'Unable to create category.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteCategory(category) {
    if (!window.confirm(`Delete the ${category.name} category? Existing charges and payment history will be preserved.`)) return

    setCategoryError('')
    try {
      await api.delete(`/service-charge-categories/${category.id}`)
      await loadOptions()
    } catch (error) {
      setCategoryError(getApiError(error, 'Unable to delete service charge category.'))
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
    <section className="mx-auto max-w-7xl space-y-6 pb-8">
      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand text-white"><ReceiptText size={21} /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Rental operations</p>
            <h1 className="mt-1 text-2xl font-semibold leading-tight text-ink">Service charges</h1>
            <p className="mt-1 text-sm text-muted">Monthly billing, collections, and tenant balances.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex">
          {canManageCategories ? <button type="button" onClick={() => { setEditingCategory(categories[0] || null); setCategoryError(''); setCategoryFormOpen(true) }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm font-semibold text-ink hover:bg-canvas"><Settings2 size={16} />{categories.length ? 'Billing setup' : 'Add category'}</button> : null}
          {canManage ? <button type="button" onClick={openCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"><Plus size={17} />Create charge</button> : null}
        </div>
      </header>

      {canManageCategories ? (
        <section className="flex flex-col gap-4 rounded-lg border border-line bg-panel p-4 sm:flex-row sm:items-center sm:justify-between">
          {categories.length ? categories.map((category) => (
            <div key={category.id} className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-800"><CheckCircle2 size={18} /></span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{category.name}</p>
                <p className="mt-0.5 text-xs text-muted">{category.is_active ? 'Automatic monthly billing active' : 'Automatic monthly billing paused'}</p>
              </div>
              <p className="ml-auto shrink-0 text-right text-lg font-semibold tabular-nums text-ink sm:ml-6">{category.monthly_amount ? formatMoney(category.monthly_amount) : '—'}<span className="ml-1 text-xs font-normal text-muted">/ month</span></p>
            </div>
          )) : (
            <div><p className="text-sm font-semibold text-ink">No monthly category configured</p><p className="mt-1 text-xs text-muted">Add a category to resume automatic charges.</p></div>
          )}
          <div className="flex shrink-0 gap-2 border-t border-line pt-3 sm:border-0 sm:pt-0">
            {categories.length ? <button type="button" onClick={() => { setEditingCategory(categories[0]); setCategoryError(''); setCategoryFormOpen(true) }} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-canvas"><Settings2 size={15} />Configure</button> : null}
            {categoryError ? <span role="alert" className="self-center text-xs text-red-700">{categoryError}</span> : null}
          </div>
        </section>
      ) : null}

      {pageError ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</p> : null}

      <section className="overflow-hidden rounded-lg border border-line bg-panel">
        <div className="grid gap-3 border-b border-line p-3 sm:p-4 lg:grid-cols-[minmax(190px,0.8fr)_minmax(230px,1.4fr)_repeat(3,minmax(135px,0.8fr))]">
          <label className="grid gap-1 text-xs font-semibold text-muted">Billing month<input aria-label="Billing month" type="month" value={month} onChange={(event) => updateFilter(setMonth, event.target.value)} className="min-h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm font-normal text-ink" /></label>
          <label className="relative grid gap-1 text-xs font-semibold text-muted">Search<Search size={16} className="pointer-events-none absolute left-3 top-[34px] text-muted" /><input value={search} onChange={(event) => updateFilter(setSearch, event.target.value)} placeholder="Tenant, property, category" className="min-h-10 w-full rounded-md border border-line bg-canvas py-2 pl-9 pr-3 text-sm font-normal text-ink" /></label>
          <label className="grid gap-1 text-xs font-semibold text-muted">Category<select aria-label="Filter by category" value={categoryId} onChange={(event) => updateFilter(setCategoryId, event.target.value)} className="min-h-10 rounded-md border border-line bg-canvas px-3 text-sm font-normal text-ink"><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-semibold text-muted">Status<select aria-label="Filter by payment status" value={status} onChange={(event) => updateFilter(setStatus, event.target.value)} className="min-h-10 rounded-md border border-line bg-canvas px-3 text-sm font-normal capitalize text-ink"><option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-semibold text-muted">Tenant<select aria-label="Filter by tenant" value={tenantId} onChange={(event) => updateFilter(setTenantId, event.target.value)} className="min-h-10 rounded-md border border-line bg-canvas px-3 text-sm font-normal text-ink"><option value="">All tenants</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.first_name} {tenant.last_name}</option>)}</select></label>
        </div>

        <div className="grid grid-cols-3 divide-x divide-line border-b border-line bg-canvas/70">
          <div className="min-w-0 px-3 py-3 sm:px-5"><p className="truncate text-[11px] font-semibold uppercase text-muted">Billed · {formatBillingMonth(month)}</p><p className="mt-1 text-base font-semibold tabular-nums text-ink sm:text-lg">{formatMoney(monthlySummary.amount_billed)}</p></div>
          <div className="min-w-0 px-3 py-3 sm:px-5"><p className="truncate text-[11px] font-semibold uppercase text-muted">Collected</p><p className="mt-1 text-base font-semibold tabular-nums text-emerald-800 sm:text-lg">{formatMoney(monthlySummary.amount_collected)}</p></div>
          <div className="min-w-0 px-3 py-3 sm:px-5"><p className="truncate text-[11px] font-semibold uppercase text-muted">Outstanding</p><p className="mt-1 text-base font-semibold tabular-nums text-amber-800 sm:text-lg">{formatMoney(monthlySummary.outstanding_balance)}</p></div>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted"><Loader2 size={18} className="animate-spin text-brand" />Loading service charges</div>
        ) : charges.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-canvas text-muted"><ReceiptText size={20} /></span>
            <h3 className="mt-3 font-semibold text-ink">No service charges for {formatBillingMonth(month)}</h3>
            <p className="mt-1 text-sm text-muted">{search || status || categoryId || tenantId || propertyId ? 'Try adjusting the filters.' : 'Create a charge or check automatic billing setup.'}</p>
          </div>
        ) : (
          <>
            <div className="hidden items-center gap-4 border-b border-line px-4 py-3 text-[11px] font-semibold uppercase text-muted lg:flex">
              <span className="min-w-0 flex-[1.7]">Tenant / property</span><span className="min-w-0 flex-[0.8]">Billing month</span><span className="w-28">Status</span><span className="w-[18rem] text-right">Due · collected · balance</span><span className="w-36 text-right">Actions</span>
            </div>
            {charges.map((charge) => (
              <article key={charge.id} className="flex flex-col gap-3 border-b border-line px-4 py-4 last:border-b-0 odd:bg-white even:bg-[#f8faf7] hover:bg-canvas/70 lg:flex-row lg:items-center lg:gap-4">
                <Link to={`/service-charges/${charge.id}`} className="flex min-w-0 flex-[1.7] items-start gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand/10 text-brand"><ReceiptText size={16} /></span>
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">{charge.client?.full_name || 'Tenant'} <span className="font-normal text-muted">· {charge.rental_property?.name || 'Rental property'}</span></span><span className="mt-0.5 block truncate text-xs text-muted">{charge.description || charge.category?.name || 'Service charge'} · Billed {formatDate(charge.billing_date)} · Due {formatDate(charge.due_date)}</span></span>
                </Link>
                <span className="pl-[46px] text-sm text-muted sm:pl-0 lg:min-w-0 lg:flex-[0.8]">{formatBillingMonth(charge.billing_month, charge.billing_period_start)}</span>
                <span className="pl-[46px] sm:pl-0 lg:w-28"><StatusBadge status={charge.status} /></span>
                <span className="grid grid-cols-3 gap-2 pl-[46px] text-sm sm:pl-0 lg:w-[18rem]">
                  <span><span className="block text-[10px] text-muted lg:hidden">Due</span><span className="font-semibold tabular-nums text-ink">{formatMoney(charge.amount_due)}</span></span>
                  <span><span className="block text-[10px] text-muted lg:hidden">Paid</span><span className="font-semibold tabular-nums text-ink">{formatMoney(charge.amount_paid)}</span></span>
                  <span><span className="block text-[10px] text-muted lg:hidden">Balance</span><span className="font-semibold tabular-nums text-ink">{formatMoney(charge.balance)}</span></span>
                </span>
                <span className="flex gap-2 pl-[46px] sm:pl-0 lg:w-36 lg:justify-end">
                  <Link to={`/service-charges/${charge.id}`} aria-label="View service charge" className="inline-flex min-h-9 items-center justify-center rounded-md border border-line px-3 text-xs font-medium text-ink hover:bg-white">View</Link>
                  {canManage ? <button type="button" disabled={charge.amount_paid > 0} onClick={() => { setEditingCharge(charge); setFormError(''); setFormOpen(true) }} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-line px-2.5 text-xs font-medium text-ink hover:bg-white disabled:opacity-50"><Edit3 size={13} />Edit</button> : null}
                </span>
              </article>
            ))}
          </>
        )}
      </section>

      {!loading && meta.last_page > 1 ? (
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">Page {meta.current_page} of {meta.last_page} · {meta.total} charges</p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-line px-3 py-2 text-sm disabled:opacity-50"><ChevronLeft size={16} />Previous</button>
            <button type="button" disabled={page >= meta.last_page} onClick={() => setPage((current) => current + 1)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-line px-3 py-2 text-sm disabled:opacity-50">Next<ChevronRight size={16} /></button>
          </div>
        </div>
      ) : null}

      {formOpen ? <ChargeForm key={editingCharge?.id || 'new-charge'} initialValues={editingCharge ? chargeToForm(editingCharge) : emptyForm} categories={categories} rentals={rentals} mode={editingCharge ? 'edit' : 'create'} submitting={submitting} error={formError} onClose={() => setFormOpen(false)} onSubmit={saveCharge} /> : null}
      {categoryFormOpen ? <CategoryForm key={editingCategory?.id || 'new'} category={editingCategory} onClose={() => { setCategoryFormOpen(false); setEditingCategory(null) }} onSubmit={saveCategory} submitting={submitting} error={categoryError} /> : null}
    </section>
  )
}
