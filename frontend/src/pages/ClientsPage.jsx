import {
  CreditCard,
  Edit3,
  Eye,
  Home,
  Landmark,
  Loader2,
  Mail,
  Phone,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { formatMoney } from '../utils/formatters'

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  occupation: '',
  referred_by: '',
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
  const colors =
    type === 'email'
      ? 'border-brand/15 bg-brand/5 text-brand hover:bg-brand/10'
      : 'border-accent/20 bg-accent/10 text-accent hover:bg-accent/15'

  if (!value) {
    return (
      <span className="inline-flex items-center gap-2 rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs font-medium text-muted">
        <Icon size={14} />
        No {type}
      </span>
    )
  }

  return (
    <a
      href={href}
      className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${colors}`}
    >
      <Icon size={14} />
      {value}
    </a>
  )
}

function ClientAvatar({ name }) {
  const initials = name
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-brand text-sm font-semibold text-white shadow-sm">
      {initials || 'CL'}
    </div>
  )
}

function EmptyState({ children }) {
  return (
    <p className="rounded-md bg-canvas p-4 text-sm text-muted">
      {children}
    </p>
  )
}

function ActivityStat({ label, value, icon: Icon }) {
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

function ActivityModal({ client, activity, loading, error, onClose }) {
  const summary = activity?.summary || {}
  const details = activity?.client || client

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 px-0 py-0 backdrop-blur-sm sm:px-4 sm:py-6">
      <div className="mx-auto min-h-screen w-full max-w-6xl border border-line bg-canvas shadow-2xl sm:min-h-0 sm:rounded-lg">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-panel px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="text-sm font-medium text-brand">Client activity</p>
            <h3 className="mt-1 text-lg font-semibold text-ink sm:text-xl">{details?.full_name}</h3>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              <ContactLink type="email" value={details?.email} />
              <ContactLink type="phone" value={details?.phone} />
            </div>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-muted hover:bg-canvas"
            onClick={onClose}
            aria-label="Close client activity"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[380px] items-center justify-center gap-2 text-sm text-muted">
            <Loader2 size={18} className="animate-spin" />
            Loading client activity
          </div>
        ) : error ? (
          <div className="m-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : activity ? (
          <div className="space-y-4 p-4 sm:space-y-5 sm:p-5">
            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <ActivityStat
                label="Total paid"
                value={formatMoney(summary.total_amount_paid || 0)}
                icon={CreditCard}
              />
              <ActivityStat
                label="Outstanding"
                value={formatMoney(summary.outstanding_balance || 0)}
                icon={Landmark}
              />
              <ActivityStat
                label="Properties"
                value={summary.allocated_properties || 0}
                icon={Home}
              />
              <ActivityStat
                label="Receipts"
                value={summary.receipts_generated || 0}
                icon={ReceiptText}
              />
            </section>

            <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-5">
                <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-ink">Profile</h4>
                  <div className="mt-4 grid gap-3 text-sm">
                    <div className="rounded-md bg-canvas p-3">
                      <p className="text-xs uppercase text-muted">Referred by</p>
                      <p className="mt-1 font-medium text-ink">{details.referred_by || 'Not specified'}</p>
                    </div>
                    <div className="rounded-md bg-canvas p-3">
                      <p className="text-xs uppercase text-muted">Occupation</p>
                      <p className="mt-1 font-medium text-ink">{details.occupation || 'Not specified'}</p>
                    </div>
                    <div className="hidden rounded-md bg-canvas p-3 sm:block">
                      <p className="text-xs uppercase text-muted">Address</p>
                      <p className="mt-1 text-ink">{details.address || 'No address'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-ink">Recent activity</h4>
                    <span className="rounded-md bg-canvas px-2 py-1 text-xs font-semibold text-muted">
                      Latest 5
                    </span>
                  </div>
                  <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
                    {activity.recent_activities?.slice(0, 5).map((item, index) => (
                      <div key={`${item.type}-${item.occurred_at}-${index}`} className="rounded-md bg-canvas p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-ink">{item.label}</p>
                            <p className="mt-1 text-xs text-muted">{item.description}</p>
                          </div>
                          <span className="whitespace-nowrap text-xs text-muted">
                            {item.occurred_at ? new Date(item.occurred_at).toLocaleDateString() : '-'}
                          </span>
                        </div>
                        {item.amount ? (
                          <p className="mt-2 text-sm font-semibold text-brand">{formatMoney(item.amount)}</p>
                        ) : null}
                      </div>
                    ))}

                    {!activity.recent_activities?.length ? (
                      <p className="rounded-md bg-canvas p-4 text-sm text-muted">No recent activity yet.</p>
                    ) : null}
                  </div>
                </div>

              </div>

              <div className="space-y-5">
                <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-ink">Allocated properties</h4>
                  <div className="mt-4 space-y-3 md:hidden">
                    {activity.properties?.map((property) => (
                      <div key={property.id} className="rounded-md border border-line bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-ink">{property.title}</p>
                            <p className="mt-1 text-xs text-muted">{property.location}</p>
                          </div>
                          <span className="rounded-md bg-brand/10 px-2 py-1 text-xs font-semibold capitalize text-brand">
                            {property.status}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-ink">{formatMoney(property.price)}</p>
                      </div>
                    ))}
                    {!activity.properties?.length ? (
                      <EmptyState>No allocated properties yet.</EmptyState>
                    ) : null}
                  </div>
                  <div className="mt-4 hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[620px] text-left text-sm">
                      <thead className="text-xs uppercase text-muted">
                        <tr className="border-b border-line">
                          <th className="py-2 pr-3">Property</th>
                          <th className="py-2 pr-3">Location</th>
                          <th className="py-2 pr-3">Price</th>
                          <th className="py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.properties?.map((property) => (
                          <tr key={property.id} className="border-b border-line last:border-0">
                            <td className="py-3 pr-3 font-medium text-ink">{property.title}</td>
                            <td className="py-3 pr-3 text-muted">{property.location}</td>
                            <td className="py-3 pr-3 font-semibold text-ink">{formatMoney(property.price)}</td>
                            <td className="py-3 capitalize text-muted">{property.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!activity.properties?.length ? (
                      <p className="py-6 text-sm text-muted">No allocated properties yet.</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-ink">Installment history</h4>
                  <div className="mt-4 space-y-3">
                    {activity.installments?.map((installment) => (
                      <div key={installment.allocation_id} className="rounded-md border border-line bg-white p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-ink">{installment.property || 'Property'}</p>
                            <p className="mt-1 text-xs capitalize text-muted">
                              {installment.payment_plan} plan - {installment.status}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-brand">
                            {formatMoney(installment.amount_paid)} paid
                          </p>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                          <span className="rounded-md bg-canvas p-2">Total {formatMoney(installment.total_amount)}</span>
                          <span className="rounded-md bg-canvas p-2">Balance {formatMoney(installment.balance)}</span>
                          <span className="rounded-md bg-canvas p-2">{installment.payments_count} payments</span>
                        </div>
                      </div>
                    ))}
                    {!activity.installments?.length ? (
                      <p className="rounded-md bg-canvas p-4 text-sm text-muted">No installment records yet.</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-ink">Payment history</h4>
                <div className="mt-4 space-y-3 md:hidden">
                  {activity.payments?.map((payment) => (
                    <div key={payment.id} className="rounded-md border border-line bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">{formatMoney(payment.amount)}</p>
                          <p className="mt-1 text-xs text-muted">{payment.property?.title || 'Property'}</p>
                        </div>
                        <span className="rounded-md bg-canvas px-2 py-1 text-xs font-semibold capitalize text-muted">
                          {payment.status}
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-muted">
                        {payment.paid_at ? new Date(payment.paid_at).toLocaleString() : 'No payment date'}
                      </p>
                    </div>
                  ))}
                  {!activity.payments?.length ? (
                    <EmptyState>No payments recorded yet.</EmptyState>
                  ) : null}
                </div>
                <div className="mt-4 hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="text-xs uppercase text-muted">
                      <tr className="border-b border-line">
                        <th className="py-2 pr-3">Property</th>
                        <th className="py-2 pr-3">Amount</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2">Paid at</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activity.payments?.map((payment) => (
                        <tr key={payment.id} className="border-b border-line last:border-0">
                          <td className="py-3 pr-3 text-ink">{payment.property?.title || 'Property'}</td>
                          <td className="py-3 pr-3 font-semibold text-ink">{formatMoney(payment.amount)}</td>
                          <td className="py-3 pr-3 capitalize text-muted">{payment.status}</td>
                          <td className="py-3 text-muted">
                            {payment.paid_at ? new Date(payment.paid_at).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!activity.payments?.length ? (
                    <p className="py-6 text-sm text-muted">No payments recorded yet.</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-ink">Receipts generated</h4>
                <div className="mt-4 space-y-3 md:hidden">
                  {activity.receipts?.map((receipt) => (
                    <div key={receipt.id} className="rounded-md border border-line bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">{receipt.receipt_number}</p>
                          <p className="mt-1 text-xs text-muted">
                            {receipt.issued_at ? new Date(receipt.issued_at).toLocaleString() : 'No issue date'}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-brand">
                          {formatMoney(receipt.payment?.amount || receipt.metadata?.amount || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {!activity.receipts?.length ? (
                    <EmptyState>No receipts generated yet.</EmptyState>
                  ) : null}
                </div>
                <div className="mt-4 hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="text-xs uppercase text-muted">
                      <tr className="border-b border-line">
                        <th className="py-2 pr-3">Receipt</th>
                        <th className="py-2 pr-3">Amount</th>
                        <th className="py-2">Issued</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activity.receipts?.map((receipt) => (
                        <tr key={receipt.id} className="border-b border-line last:border-0">
                          <td className="py-3 pr-3 font-medium text-ink">{receipt.receipt_number}</td>
                          <td className="py-3 pr-3 font-semibold text-ink">
                            {formatMoney(receipt.payment?.amount || receipt.metadata?.amount || 0)}
                          </td>
                          <td className="py-3 text-muted">
                            {receipt.issued_at ? new Date(receipt.issued_at).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!activity.receipts?.length ? (
                    <p className="py-6 text-sm text-muted">No receipts generated yet.</p>
                  ) : null}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ClientModal({ mode, initialValues, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState(initialValues)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit(form)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-line bg-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-ink">
              {mode === 'create' ? 'Add client' : 'Edit client'}
            </h3>
            <p className="text-sm text-muted">
              Keep client contact and profile details accurate.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-muted hover:bg-canvas"
            onClick={onClose}
            aria-label="Close client form"
          >
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-ink">First name</span>
              <input
                value={form.first_name}
                onChange={(event) =>
                  updateField('first_name', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Last name</span>
              <input
                value={form.last_name}
                onChange={(event) =>
                  updateField('last_name', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="client@example.com"
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
              <span className="text-sm font-medium text-ink">Occupation</span>
              <input
                value={form.occupation}
                onChange={(event) =>
                  updateField('occupation', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="Engineer, investor, business owner"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-ink">Referred by</span>
              <input
                value={form.referred_by}
                onChange={(event) =>
                  updateField('referred_by', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="Realtor or agent name"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-ink">Address</span>
            <textarea
              value={form.address}
              onChange={(event) => updateField('address', event.target.value)}
              rows="4"
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
              {mode === 'create' ? 'Create client' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ClientsPage() {
  const [clients, setClients] = useState([])
  const [meta, setMeta] = useState(null)
  const [filters, setFilters] = useState({ search: '' })
  const [query, setQuery] = useState({ search: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState(null)
  const [activityClient, setActivityClient] = useState(null)
  const [activity, setActivity] = useState(null)
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState('')

  const modalInitialValues = useMemo(() => {
    if (modal?.client) {
      return {
        first_name: modal.client.first_name || '',
        last_name: modal.client.last_name || '',
        email: modal.client.email || '',
        phone: modal.client.phone || '',
        address: modal.client.address || '',
        occupation: modal.client.occupation || '',
        referred_by: modal.client.referred_by || '',
      }
    }

    return emptyForm
  }, [modal])

  const loadClients = useCallback(async (params) => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/clients', {
        params: {
          per_page: 20,
          search: params.search || undefined,
        },
      })

      setClients(response.data.data)
      setMeta(response.data.meta)
    } catch (err) {
      setError(getApiError(err, 'Clients could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadClients(query)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadClients, query])

  function applyFilters(event) {
    event.preventDefault()
    setQuery(filters)
  }

  function resetFilters() {
    const nextFilters = { search: '' }
    setFilters(nextFilters)
    setQuery(nextFilters)
  }

  async function handleSubmit(payload) {
    setSubmitting(true)
    setError('')
    setNotice('')

    try {
      if (modal?.mode === 'edit') {
        await api.patch(`/clients/${modal.client.id}`, payload)
        setNotice('Client updated successfully.')
      } else {
        await api.post('/clients', payload)
        setNotice('Client created successfully.')
      }

      setModal(null)
      await loadClients(query)
    } catch (err) {
      setError(getApiError(err, 'Client could not be saved.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteClient(client) {
    const confirmed = window.confirm(`Delete ${client.full_name}?`)

    if (!confirmed) {
      return
    }

    setError('')
    setNotice('')

    try {
      await api.delete(`/clients/${client.id}`)
      setNotice('Client deleted successfully.')
      await loadClients(query)
    } catch (err) {
      setError(getApiError(err, 'Client could not be deleted.'))
    }
  }

  async function viewClientActivity(client) {
    setActivityClient(client)
    setActivity(null)
    setActivityError('')
    setActivityLoading(true)

    try {
      const response = await api.get(`/clients/${client.id}/activity`)
      setActivity(response.data.data)
    } catch (err) {
      setActivityError(getApiError(err, 'Client activity could not be loaded.'))
    } finally {
      setActivityLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-brand">Clients</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            Client records
          </h2>
          <p className="mt-2 text-sm text-muted">
            Manage buyer profiles, contact details, and relationship history.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ mode: 'create' })}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Plus size={17} />
          Add client
        </button>
      </div>

      <form
        className="grid gap-3 rounded-lg border border-line bg-panel p-4 shadow-sm md:grid-cols-[1fr_auto_auto]"
        onSubmit={applyFilters}
      >
        <label className="relative block">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
            className="w-full rounded-md border border-line bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand"
            placeholder="Search name, email, or phone"
          />
        </label>

        <button
          type="submit"
          className="rounded-md border border-brand bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Search
        </button>

        <button
          type="button"
          onClick={resetFilters}
          className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-muted hover:bg-canvas hover:text-ink"
        >
          Reset
        </button>
      </form>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-sm">
        <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-brand/10 text-brand">
              <Users size={18} />
            </span>
            <div>
              <h3 className="text-base font-semibold text-ink">Clients</h3>
              <p className="text-xs text-muted">CRM-ready contact overview</p>
            </div>
          </div>
          <span className="rounded-md border border-line bg-canvas px-3 py-1.5 text-sm font-semibold text-muted">
            {meta?.total ?? clients.length} total
          </span>
        </div>

        <div className="divide-y divide-line md:hidden">
          {clients.map((client) => (
            <article key={client.id} className="bg-white p-4 transition hover:bg-brand/5">
              <div className="flex items-start gap-3">
                <ClientAvatar name={client.full_name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{client.full_name}</p>
                      <p className="mt-1 text-xs text-muted">
                        {client.occupation || 'Client'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => viewClientActivity(client)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-brand/20 bg-brand/5 px-2.5 py-1.5 text-xs font-semibold text-brand"
                      aria-label={`View ${client.full_name}`}
                    >
                      <Eye size={14} />
                      View
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <ContactLink type="phone" value={client.phone} />
                    <ContactLink type="email" value={client.email} />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate rounded-md border border-accent/20 bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-accent">
                      {client.referred_by || 'Direct client'}
                    </span>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => setModal({ mode: 'edit', client })}
                        className="rounded-md border border-line bg-white p-2 text-muted hover:bg-canvas hover:text-ink"
                        aria-label={`Edit ${client.full_name}`}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteClient(client)}
                        className="rounded-md border border-red-100 bg-white p-2 text-red-600 hover:bg-red-50"
                        aria-label={`Delete ${client.full_name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}

          {!loading && clients.length === 0 ? (
            <div className="px-4 py-10 text-center text-muted">
              No clients found.
            </div>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold tracking-wide">Client</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Occupation</th>
                <th className="px-4 py-3 font-semibold">Referred by</th>
                <th className="px-4 py-3 font-semibold">Address</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b border-line/80 transition hover:bg-brand/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ClientAvatar name={client.full_name} />
                      <div>
                        <p className="font-semibold text-ink">{client.full_name}</p>
                        <p className="mt-1 inline-flex rounded-md bg-canvas px-2 py-1 text-xs font-medium text-muted">
                          ID #{client.id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-2">
                      <ContactLink type="email" value={client.email} />
                      <ContactLink type="phone" value={client.phone} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex max-w-[180px] rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs font-medium text-muted">
                      {client.occupation || 'Not specified'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex max-w-[180px] rounded-md border border-accent/20 bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-accent">
                      {client.referred_by || 'Direct client'}
                    </span>
                  </td>
                  <td className="max-w-[260px] px-4 py-3">
                    <p className="truncate rounded-md bg-canvas px-2.5 py-1.5 text-xs text-muted">
                      {client.address || 'No address'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => viewClientActivity(client)}
                        className="inline-flex items-center gap-1 rounded-md border border-brand/20 bg-brand/5 px-2.5 py-2 text-sm font-semibold text-brand hover:bg-brand/10"
                        aria-label={`View ${client.full_name}`}
                      >
                        <Eye size={16} />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => setModal({ mode: 'edit', client })}
                        className="rounded-md border border-line bg-white p-2 text-muted hover:bg-canvas hover:text-ink"
                        aria-label={`Edit ${client.full_name}`}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteClient(client)}
                        className="rounded-md border border-red-100 bg-white p-2 text-red-600 hover:bg-red-50"
                        aria-label={`Delete ${client.full_name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && clients.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-muted" colSpan="6">
                    No clients found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 border-t border-line px-4 py-6 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" />
            Loading clients
          </div>
        ) : null}
      </section>

      {modal ? (
        <ClientModal
          key={`${modal.mode}-${modal.client?.id || 'new'}`}
          mode={modal.mode}
          initialValues={modalInitialValues}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      ) : null}

      {activityClient ? (
        <ActivityModal
          client={activityClient}
          activity={activity}
          loading={activityLoading}
          error={activityError}
          onClose={() => {
            setActivityClient(null)
            setActivity(null)
            setActivityError('')
          }}
        />
      ) : null}
    </div>
  )
}
