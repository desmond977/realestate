import {
  Home,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { formatMoney } from '../utils/formatters'

const allocationStatuses = ['active', 'completed', 'cancelled']
const paymentPlans = ['installment', 'full']

const emptyForm = {
  property_id: '',
  client_id: '',
  total_amount: '',
  payment_plan: 'installment',
  allocated_at: '',
  notes: '',
  initial_payment_amount: '',
  payment_method: '',
  transaction_reference: '',
  paid_at: '',
  payment_notes: '',
}

function getApiError(error, fallback) {
  const errors = error.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  return error.response?.data?.message || fallback
}

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    completed: 'bg-slate-100 text-slate-700 border-slate-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold capitalize ${
        styles[status] || styles.active
      }`}
    >
      {status}
    </span>
  )
}

function AllocationModal({
  clients,
  properties,
  submitting,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(emptyForm)
  const selectedProperty = properties.find(
    (property) => String(property.id) === String(form.property_id),
  )

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value }

      if (field === 'property_id') {
        const property = properties.find(
          (item) => String(item.id) === String(value),
        )
        next.total_amount = property?.price ?? ''
      }

      if (field === 'payment_plan' && value === 'full') {
        next.initial_payment_amount = next.total_amount
      }

      return next
    })
  }

  function handleSubmit(event) {
    event.preventDefault()

    const payload = {
      property_id: Number(form.property_id),
      client_id: Number(form.client_id),
      total_amount: Number(form.total_amount),
      payment_plan: form.payment_plan,
      allocated_at: form.allocated_at || undefined,
      notes: form.notes || undefined,
      initial_payment_amount: form.initial_payment_amount
        ? Number(form.initial_payment_amount)
        : undefined,
      payment_method: form.payment_method || undefined,
      transaction_reference: form.transaction_reference || undefined,
      paid_at: form.paid_at || undefined,
      payment_notes: form.payment_notes || undefined,
    }

    onSubmit(payload)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-line bg-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-ink">Create allocation</h3>
            <p className="text-sm text-muted">
              Allocate an available property and optionally record the first payment.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-muted hover:bg-canvas"
            onClick={onClose}
            aria-label="Close allocation form"
          >
            <X size={20} />
          </button>
        </div>

        <form className="space-y-5 px-5 py-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-ink">Property</span>
              <select
                value={form.property_id}
                onChange={(event) =>
                  updateField('property_id', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                required
              >
                <option value="">Select property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title} - {formatMoney(property.price)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Client</span>
              <select
                value={form.client_id}
                onChange={(event) =>
                  updateField('client_id', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                required
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Total amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.total_amount}
                onChange={(event) =>
                  updateField('total_amount', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Payment plan</span>
              <select
                value={form.payment_plan}
                onChange={(event) =>
                  updateField('payment_plan', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm capitalize outline-none focus:border-brand"
              >
                {paymentPlans.map((plan) => (
                  <option key={plan} value={plan}>
                    {plan}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Allocation date</span>
              <input
                type="date"
                value={form.allocated_at}
                onChange={(event) =>
                  updateField('allocated_at', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Initial payment</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.initial_payment_amount}
                onChange={(event) =>
                  updateField('initial_payment_amount', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                placeholder={selectedProperty ? formatMoney(selectedProperty.price) : '0'}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-ink">Payment method</span>
              <input
                value={form.payment_method}
                onChange={(event) =>
                  updateField('payment_method', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="bank_transfer, cash, pos"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Reference</span>
              <input
                value={form.transaction_reference}
                onChange={(event) =>
                  updateField('transaction_reference', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-ink">Notes</span>
            <textarea
              value={form.notes}
              onChange={(event) => updateField('notes', event.target.value)}
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
              Create allocation
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function AllocationsPage() {
  const [allocations, setAllocations] = useState([])
  const [clients, setClients] = useState([])
  const [properties, setProperties] = useState([])
  const [meta, setMeta] = useState(null)
  const [filters, setFilters] = useState({ status: '' })
  const [query, setQuery] = useState({ status: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const availableProperties = useMemo(
    () => properties.filter((property) => property.status === 'available'),
    [properties],
  )

  const loadAllocations = useCallback(async (params) => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/allocations', {
        params: {
          per_page: 20,
          status: params.status || undefined,
        },
      })

      setAllocations(response.data.data)
      setMeta(response.data.meta)
    } catch (err) {
      setError(getApiError(err, 'Allocations could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadFormOptions = useCallback(async () => {
    try {
      const [clientsResponse, propertiesResponse] = await Promise.all([
        api.get('/clients', { params: { per_page: 100 } }),
        api.get('/properties', {
          params: { per_page: 100, status: 'available' },
        }),
      ])

      setClients(clientsResponse.data.data)
      setProperties(propertiesResponse.data.data)
    } catch (err) {
      setError(getApiError(err, 'Form options could not be loaded.'))
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAllocations(query)
      loadFormOptions()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadAllocations, loadFormOptions, query])

  function applyFilters(event) {
    event.preventDefault()
    setQuery(filters)
  }

  function resetFilters() {
    const nextFilters = { status: '' }
    setFilters(nextFilters)
    setQuery(nextFilters)
  }

  async function handleSubmit(payload) {
    setSubmitting(true)
    setError('')
    setNotice('')

    try {
      await api.post('/allocations', payload)
      setNotice('Allocation created successfully.')
      setModalOpen(false)
      await loadAllocations(query)
      await loadFormOptions()
    } catch (err) {
      setError(getApiError(err, 'Allocation could not be created.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function cancelAllocation(allocation) {
    const confirmed = window.confirm(
      `Cancel allocation for ${allocation.client?.full_name || 'this client'}?`,
    )

    if (!confirmed) {
      return
    }

    setError('')
    setNotice('')

    try {
      await api.delete(`/allocations/${allocation.id}`)
      setNotice('Allocation cancelled successfully.')
      await loadAllocations(query)
      await loadFormOptions()
    } catch (err) {
      setError(getApiError(err, 'Allocation could not be cancelled.'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-brand">Allocations</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            Property allocations
          </h2>
          <p className="mt-2 text-sm text-muted">
            Assign properties to clients and track balances from the first payment.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Plus size={17} />
          New allocation
        </button>
      </div>

      <form
        className="grid gap-3 rounded-lg border border-line bg-panel p-4 shadow-sm md:grid-cols-[220px_auto_auto]"
        onSubmit={applyFilters}
      >
        <select
          value={filters.status}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              status: event.target.value,
            }))
          }
          className="rounded-md border border-line bg-white px-3 py-2.5 text-sm capitalize outline-none focus:border-brand"
        >
          <option value="">All statuses</option>
          {allocationStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-brand bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Search size={16} />
          Filter
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

      <section className="rounded-lg border border-line bg-panel shadow-sm">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <Home size={18} className="text-brand" />
            <h3 className="text-base font-semibold text-ink">Allocations</h3>
          </div>
          <span className="text-sm text-muted">
            {meta?.total ?? allocations.length} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-canvas text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Property</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Paid</th>
                <th className="px-4 py-3 font-semibold">Balance</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((allocation) => (
                <tr key={allocation.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">
                      {allocation.client?.full_name || 'Client'}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {allocation.allocated_at || 'No date'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">
                      {allocation.property?.title || 'Property'}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {allocation.property?.location || 'No location'}
                    </p>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted">
                    {allocation.payment_plan}
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">
                    {formatMoney(allocation.amount_paid)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">
                    {formatMoney(allocation.balance)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={allocation.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => cancelAllocation(allocation)}
                        disabled={
                          allocation.status !== 'active' ||
                          Number(allocation.amount_paid) > 0
                        }
                        className="rounded-md border border-line p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Cancel allocation"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && allocations.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-muted" colSpan="7">
                    No allocations found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 border-t border-line px-4 py-6 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" />
            Loading allocations
          </div>
        ) : null}
      </section>

      {modalOpen ? (
        <AllocationModal
          clients={clients}
          properties={availableProperties}
          submitting={submitting}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  )
}
