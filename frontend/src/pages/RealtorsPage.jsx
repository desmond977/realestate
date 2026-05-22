import {
  CreditCard,
  Download,
  Edit3,
  Eye,
  Home,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { ReceiptDocumentModal } from '../components/receipts/ReceiptDocument'
import { formatMoney } from '../utils/formatters'

const emptyForm = {
  full_name: '',
  phone: '',
  email: '',
  address: '',
  company_name: '',
  profile_image: '',
  status: 'active',
}

function getApiError(error, fallback) {
  const errors = error.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  return error.response?.data?.message || fallback
}

function ContactLink({ type, value }) {
  const Icon = type === 'email' ? Mail : Phone
  const href = type === 'email' ? `mailto:${value}` : `tel:${value}`

  if (!value) {
    return <span className="text-xs text-muted">No {type}</span>
  }

  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-md border border-brand/15 bg-brand/5 px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-brand/10"
    >
      <Icon size={14} />
      {value}
    </a>
  )
}

function RealtorAvatar({ realtor }) {
  const initials = realtor?.full_name
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  if (realtor?.profile_image) {
    return (
      <img
        src={realtor.profile_image}
        alt={realtor.full_name}
        className="h-12 w-12 rounded-md object-cover shadow-sm"
      />
    )
  }

  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-brand text-sm font-semibold text-white shadow-sm">
      {initials || 'RE'}
    </div>
  )
}

function StatusBadge({ status }) {
  const active = status === 'active'

  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold capitalize ${
        active
          ? 'border-brand/20 bg-brand/10 text-brand'
          : 'border-line bg-canvas text-muted'
      }`}
    >
      {status}
    </span>
  )
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-muted">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-md bg-brand/10 text-brand">
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-3 text-xl font-semibold text-ink">{value}</p>
    </div>
  )
}

function RealtorModal({ mode, initialValues, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState(initialValues)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit(form)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 px-4 py-6">
      <div className="mx-auto w-full max-w-2xl rounded-lg border border-line bg-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-ink">
              {mode === 'create' ? 'Add realtor' : 'Edit realtor'}
            </h3>
            <p className="text-sm text-muted">Manage realtor profile and referral status.</p>
          </div>
          <button type="button" className="rounded-md p-2 text-muted hover:bg-canvas" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-ink">Full name</span>
              <input
                value={form.full_name}
                onChange={(event) => updateField('full_name', event.target.value)}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Status</span>
              <select
                value={form.status}
                onChange={(event) => updateField('status', event.target.value)}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="agent@example.com"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Phone</span>
              <input
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="08030000000"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-ink">Company name</span>
              <input
                value={form.company_name}
                onChange={(event) => updateField('company_name', event.target.value)}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="Optional agency or company"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-ink">Profile image</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0]

                  if (!file) return

                  const reader = new FileReader()
                  reader.onload = () => updateField('profile_image', reader.result)
                  reader.readAsDataURL(file)
                }}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
              {form.profile_image ? (
                <img src={form.profile_image} alt="Profile preview" className="mt-3 h-16 w-16 rounded-md object-cover" />
              ) : null}
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-ink">Address</span>
            <textarea
              value={form.address}
              onChange={(event) => updateField('address', event.target.value)}
              rows="3"
              className="mt-2 w-full resize-y rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-muted hover:bg-canvas hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === 'create' ? 'Create realtor' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RealtorDetailsModal({ realtor, analytics, loading, error, onClose, onViewReceipt }) {
  const summary = analytics?.summary || {}
  const details = analytics?.realtor || realtor

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 px-0 py-0 backdrop-blur-sm sm:px-4 sm:py-6">
      <div className="mx-auto min-h-screen w-full max-w-6xl border border-line bg-canvas shadow-2xl sm:min-h-0 sm:rounded-lg">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-panel px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start gap-3">
            <RealtorAvatar realtor={details} />
            <div>
              <p className="text-sm font-medium text-brand">Realtor profile</p>
              <h3 className="mt-1 text-lg font-semibold text-ink sm:text-xl">{details?.full_name}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge status={details?.status || 'active'} />
                <ContactLink type="phone" value={details?.phone} />
                <ContactLink type="email" value={details?.email} />
              </div>
            </div>
          </div>
          <button type="button" className="rounded-md p-2 text-muted hover:bg-canvas" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[380px] items-center justify-center gap-2 text-sm text-muted">
            <Loader2 size={18} className="animate-spin" />
            Loading realtor details
          </div>
        ) : error ? (
          <div className="m-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : analytics ? (
          <div className="space-y-5 p-4 sm:p-5">
            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatCard label="Clients" value={summary.total_clients || 0} icon={Users} />
              <StatCard label="Properties sold" value={summary.total_properties_sold || 0} icon={Home} />
              <StatCard label="Revenue" value={formatMoney(summary.total_revenue || 0)} icon={CreditCard} />
              <StatCard label="Outstanding" value={formatMoney(summary.outstanding_balances || 0)} icon={TrendingUp} />
            </section>

            <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-5">
                <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-ink">Information</h4>
                  <div className="mt-4 grid gap-3 text-sm">
                    <div className="rounded-md bg-canvas p-3">
                      <p className="text-xs uppercase text-muted">Company</p>
                      <p className="mt-1 font-medium text-ink">{details.company_name || 'Independent realtor'}</p>
                    </div>
                    <div className="rounded-md bg-canvas p-3">
                      <p className="text-xs uppercase text-muted">Address</p>
                      <p className="mt-1 text-ink">{details.address || 'No address'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-ink">Financial summary</h4>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-md bg-canvas p-3 text-sm">
                      <p className="text-xs uppercase text-muted">Installment payments</p>
                      <p className="mt-1 font-semibold text-ink">{summary.total_installment_payments || 0}</p>
                    </div>
                    <div className="rounded-md bg-canvas p-3 text-sm">
                      <p className="text-xs uppercase text-muted">Fully paid properties</p>
                      <p className="mt-1 font-semibold text-ink">{summary.fully_paid_properties_count || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-ink">Connected clients</h4>
                  <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
                    {analytics.connected_clients?.map((client) => (
                      <div key={client.id} className="rounded-md border border-line bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-ink">{client.full_name}</p>
                            <p className="mt-1 text-xs text-muted">{client.property || 'No linked property'}</p>
                          </div>
                          <span className="rounded-md bg-canvas px-2 py-1 text-xs font-semibold capitalize text-muted">
                            {client.payment_status}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <ContactLink type="phone" value={client.phone} />
                          <span className="rounded-md bg-brand/5 px-2.5 py-1.5 text-xs font-semibold text-brand">
                            Balance {formatMoney(client.outstanding_balance || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {!analytics.connected_clients?.length ? (
                      <p className="rounded-md bg-canvas p-4 text-sm text-muted">No clients connected yet.</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-ink">Properties sold by realtor</h4>
                  <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
                    {analytics.properties?.map((property) => (
                      <div key={property.allocation_id} className="rounded-md border border-line bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-ink">{property.title || 'Property'}</p>
                            <p className="mt-1 text-xs text-muted">{property.client || 'Client'}</p>
                          </div>
                          <span className="rounded-md bg-brand/10 px-2 py-1 text-xs font-semibold capitalize text-brand">
                            {property.status}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                          <span className="rounded-md bg-canvas p-2">{formatMoney(property.price || 0)}</span>
                          <span className="rounded-md bg-canvas p-2">{property.payment_progress}% paid</span>
                          <span className="rounded-md bg-canvas p-2">Balance {formatMoney(property.balance || 0)}</span>
                        </div>
                        {property.latest_receipt ? (
                          <button
                            type="button"
                            onClick={() => onViewReceipt(property.latest_receipt)}
                            className="mt-3 inline-flex items-center gap-2 rounded-md border border-brand/20 bg-brand/5 px-2.5 py-1.5 text-xs font-semibold text-brand"
                          >
                            <Download size={14} />
                            Receipt
                          </button>
                        ) : null}
                      </div>
                    ))}
                    {!analytics.properties?.length ? (
                      <p className="rounded-md bg-canvas p-4 text-sm text-muted">No property sales yet.</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function RealtorsPage() {
  const [realtors, setRealtors] = useState([])
  const [meta, setMeta] = useState(null)
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [query, setQuery] = useState({ search: '', status: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState(null)
  const [detailsRealtor, setDetailsRealtor] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const [receiptDocument, setReceiptDocument] = useState(null)
  const [documentLoading, setDocumentLoading] = useState(false)
  const [documentError, setDocumentError] = useState('')

  const modalInitialValues = useMemo(() => {
    if (!modal?.realtor) {
      return emptyForm
    }

    return {
      full_name: modal.realtor.full_name || '',
      phone: modal.realtor.phone || '',
      email: modal.realtor.email || '',
      address: modal.realtor.address || '',
      company_name: modal.realtor.company_name || '',
      profile_image: modal.realtor.profile_image || '',
      status: modal.realtor.status || 'active',
    }
  }, [modal])

  const loadRealtors = useCallback(async (params) => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/realtors', {
        params: {
          per_page: 20,
          search: params.search || undefined,
          status: params.status || undefined,
        },
      })

      setRealtors(response.data.data)
      setMeta(response.data.meta)
    } catch (err) {
      setError(getApiError(err, 'Realtors could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadRealtors(query)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadRealtors, query])

  function applyFilters(event) {
    event.preventDefault()
    setQuery(filters)
  }

  function resetFilters() {
    const nextFilters = { search: '', status: '' }
    setFilters(nextFilters)
    setQuery(nextFilters)
  }

  async function handleSubmit(payload) {
    setSubmitting(true)
    setError('')
    setNotice('')

    try {
      if (modal?.mode === 'edit') {
        await api.patch(`/realtors/${modal.realtor.id}`, payload)
        setNotice('Realtor updated successfully.')
      } else {
        await api.post('/realtors', payload)
        setNotice('Realtor created successfully.')
      }

      setModal(null)
      await loadRealtors(query)
    } catch (err) {
      setError(getApiError(err, 'Realtor could not be saved.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteRealtor(realtor) {
    if (!window.confirm(`Delete ${realtor.full_name}?`)) {
      return
    }

    setError('')
    setNotice('')

    try {
      await api.delete(`/realtors/${realtor.id}`)
      setNotice('Realtor deleted successfully.')
      await loadRealtors(query)
    } catch (err) {
      setError(getApiError(err, 'Realtor could not be deleted.'))
    }
  }

  async function viewRealtor(realtor) {
    setDetailsRealtor(realtor)
    setAnalytics(null)
    setAnalyticsError('')
    setAnalyticsLoading(true)

    try {
      const response = await api.get(`/realtors/${realtor.id}/analytics`)
      setAnalytics(response.data.data)
    } catch (err) {
      setAnalyticsError(getApiError(err, 'Realtor details could not be loaded.'))
    } finally {
      setAnalyticsLoading(false)
    }
  }

  async function viewReceiptDocument(receipt) {
    setReceiptDocument(null)
    setDocumentError('')
    setDocumentLoading(true)

    try {
      const response = await api.get(`/receipts/${receipt.id}/document`)
      setReceiptDocument(response.data.data)
    } catch (err) {
      setDocumentError(getApiError(err, 'Receipt document could not be loaded.'))
    } finally {
      setDocumentLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-brand">Realtors</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">Realtor management</h2>
          <p className="mt-2 text-sm text-muted">
            Manage referral partners, linked clients, property sales, and revenue contribution.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ mode: 'create' })}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Plus size={17} />
          Add realtor
        </button>
      </div>

      <form
        className="grid gap-3 rounded-lg border border-line bg-panel p-4 shadow-sm md:grid-cols-[1fr_180px_auto_auto]"
        onSubmit={applyFilters}
      >
        <label className="relative block">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            className="w-full rounded-md border border-line bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand"
            placeholder="Search name, phone, email, or company"
          />
        </label>

        <select
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          className="rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button type="submit" className="rounded-md border border-brand bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
          Search
        </button>
        <button type="button" onClick={resetFilters} className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-muted hover:bg-canvas hover:text-ink">
          Reset
        </button>
      </form>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {notice ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-sm">
        <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-brand/10 text-brand">
              <UserPlus size={18} />
            </span>
            <div>
              <h3 className="text-base font-semibold text-ink">Realtors</h3>
              <p className="text-xs text-muted">Referral CRM dashboard</p>
            </div>
          </div>
          <span className="rounded-md border border-line bg-canvas px-3 py-1.5 text-sm font-semibold text-muted">
            {meta?.total ?? realtors.length} total
          </span>
        </div>

        <div className="divide-y divide-line md:hidden">
          {realtors.map((realtor) => (
            <article key={realtor.id} className="bg-white p-4">
              <div className="flex items-start gap-3">
                <RealtorAvatar realtor={realtor} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{realtor.full_name}</p>
                      <p className="mt-1 text-xs text-muted">{realtor.company_name || 'Independent realtor'}</p>
                    </div>
                    <StatusBadge status={realtor.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ContactLink type="phone" value={realtor.phone} />
                    <ContactLink type="email" value={realtor.email} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="rounded-md bg-canvas px-2.5 py-1.5 text-xs font-semibold text-muted">
                      {realtor.clients_count ?? 0} clients
                    </span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => viewRealtor(realtor)} className="rounded-md border border-brand/20 bg-brand/5 p-2 text-brand">
                        <Eye size={15} />
                      </button>
                      <button type="button" onClick={() => setModal({ mode: 'edit', realtor })} className="rounded-md border border-line bg-white p-2 text-muted">
                        <Edit3 size={15} />
                      </button>
                      <button type="button" onClick={() => deleteRealtor(realtor)} className="rounded-md border border-red-100 bg-white p-2 text-red-600">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Realtor</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Clients</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {realtors.map((realtor) => (
                <tr key={realtor.id} className="border-b border-line/80 transition hover:bg-brand/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <RealtorAvatar realtor={realtor} />
                      <div>
                        <p className="font-semibold text-ink">{realtor.full_name}</p>
                        <p className="mt-1 text-xs text-muted">ID #{realtor.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-2">
                      <ContactLink type="email" value={realtor.email} />
                      <ContactLink type="phone" value={realtor.phone} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{realtor.company_name || 'Independent'}</td>
                  <td className="px-4 py-3"><StatusBadge status={realtor.status} /></td>
                  <td className="px-4 py-3 font-semibold text-ink">{realtor.clients_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => viewRealtor(realtor)} className="inline-flex items-center gap-1 rounded-md border border-brand/20 bg-brand/5 px-2.5 py-2 text-sm font-semibold text-brand hover:bg-brand/10">
                        <Eye size={16} /> View
                      </button>
                      <button type="button" onClick={() => setModal({ mode: 'edit', realtor })} className="rounded-md border border-line bg-white p-2 text-muted hover:bg-canvas hover:text-ink">
                        <Edit3 size={16} />
                      </button>
                      <button type="button" onClick={() => deleteRealtor(realtor)} className="rounded-md border border-red-100 bg-white p-2 text-red-600 hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && realtors.length === 0 ? (
          <div className="px-4 py-10 text-center text-muted">No realtors found.</div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 border-t border-line px-4 py-6 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" />
            Loading realtors
          </div>
        ) : null}
      </section>

      {modal ? (
        <RealtorModal
          key={`${modal.mode}-${modal.realtor?.id || 'new'}`}
          mode={modal.mode}
          initialValues={modalInitialValues}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      ) : null}

      {detailsRealtor ? (
        <RealtorDetailsModal
          realtor={detailsRealtor}
          analytics={analytics}
          loading={analyticsLoading}
          error={analyticsError}
          onViewReceipt={viewReceiptDocument}
          onClose={() => {
            setDetailsRealtor(null)
            setAnalytics(null)
            setAnalyticsError('')
          }}
        />
      ) : null}

      {(receiptDocument || documentLoading || documentError) ? (
        <ReceiptDocumentModal
          document={receiptDocument}
          loading={documentLoading}
          error={documentError}
          onClose={() => {
            setReceiptDocument(null)
            setDocumentError('')
          }}
        />
      ) : null}
    </div>
  )
}
