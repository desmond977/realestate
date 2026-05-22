import {
  CalendarDays,
  CreditCard,
  Download,
  Eye,
  Home,
  Loader2,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { ReceiptDocumentModal } from '../components/receipts/ReceiptDocument'
import { formatMoney } from '../utils/formatters'

const allocationStatuses = ['active', 'completed', 'cancelled']
const paymentPlans = ['installment', 'full']

const emptyForm = {
  property_id: '',
  client_id: '',
  realtor_id: '',
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

function realtorName(allocation) {
  return allocation?.realtor?.full_name || allocation?.client?.realtor?.full_name || 'Direct'
}

function allocationReceipt(allocation) {
  return allocation?.payments?.find((payment) => payment.receipt?.id)?.receipt
}

function AllocationModal({
  clients,
  properties,
  realtors,
  submitting,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(emptyForm)
  const selectedProperty = properties.find(
    (property) => String(property.id) === String(form.property_id),
  )
  const selectedClient = clients.find(
    (client) => String(client.id) === String(form.client_id),
  )
  const selectedRealtor = realtors.find(
    (realtor) => String(realtor.id) === String(form.realtor_id),
  )
  const inputClass =
    'mt-2 h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10'
  const textAreaClass =
    'mt-2 w-full resize-y rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10'

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value }

      if (field === 'property_id') {
        const property = properties.find(
          (item) => String(item.id) === String(value),
        )
        next.total_amount = property?.price ?? ''
      }

      if (field === 'client_id') {
        const client = clients.find((item) => String(item.id) === String(value))
        next.realtor_id = client?.realtor_id ? String(client.realtor_id) : ''
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
      realtor_id: form.realtor_id ? Number(form.realtor_id) : undefined,
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 px-0 py-0 backdrop-blur-sm sm:px-4 sm:py-6">
      <div className="mx-auto min-h-screen w-full max-w-5xl border border-line bg-canvas shadow-2xl sm:min-h-0 sm:rounded-lg">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-panel px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand">Allocation</p>
            <h3 className="mt-1 text-lg font-semibold text-ink sm:text-xl">Create allocation</h3>
            <p className="mt-1 text-sm text-muted">
              Link the buyer, realtor, property, and first payment in one clean record.
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

        <form className="space-y-4 p-4 sm:p-5" onSubmit={handleSubmit}>
          <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-brand/10 text-brand">
                <Users size={18} />
              </span>
              <div>
                <h4 className="text-sm font-semibold text-ink">Allocation details</h4>
                <p className="text-xs text-muted">Choose the property, client, and realtor.</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="block">
                <span className="text-sm font-medium text-ink">Property</span>
                <select
                  value={form.property_id}
                  onChange={(event) =>
                    updateField('property_id', event.target.value)
                  }
                  className={inputClass}
                  required
                >
                  <option value="">Select property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title} - {formatMoney(property.price)}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-muted">
                  {selectedProperty?.location || 'Available properties only'}
                </p>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-ink">Client</span>
                <select
                  value={form.client_id}
                  onChange={(event) =>
                    updateField('client_id', event.target.value)
                  }
                  className={inputClass}
                  required
                >
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-muted">
                  {selectedClient?.phone || selectedClient?.email || 'Buyer profile'}
                </p>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-ink">Realtor</span>
                <select
                  value={form.realtor_id}
                  onChange={(event) =>
                    updateField('realtor_id', event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">No linked realtor</option>
                  {realtors.map((realtor) => (
                    <option key={realtor.id} value={realtor.id}>
                      {realtor.full_name}
                      {realtor.company_name ? ` - ${realtor.company_name}` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-muted">
                  {selectedRealtor?.company_name || 'Optional sales partner'}
                </p>
              </label>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-accent/10 text-accent">
                  <CreditCard size={18} />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-ink">Payment setup</h4>
                  <p className="text-xs text-muted">Set the total amount and payment plan.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                    className={inputClass}
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
                    className={`${inputClass} capitalize`}
                  >
                    {paymentPlans.map((plan) => (
                      <option key={plan} value={plan}>
                        {plan}
                      </option>
                    ))}
                  </select>
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
                    className={inputClass}
                    placeholder={selectedProperty ? formatMoney(selectedProperty.price) : '0'}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-ink">Allocation date</span>
                  <input
                    type="date"
                    value={form.allocated_at}
                    onChange={(event) =>
                      updateField('allocated_at', event.target.value)
                    }
                    className={inputClass}
                  />
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-brand/10 text-brand">
                  <CalendarDays size={18} />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-ink">First payment</h4>
                  <p className="text-xs text-muted">Optional receipt details.</p>
                </div>
              </div>

              <div className="grid gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-ink">Payment method</span>
                  <input
                    value={form.payment_method}
                    onChange={(event) =>
                      updateField('payment_method', event.target.value)
                    }
                    className={inputClass}
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
                    className={inputClass}
                    placeholder="Transaction reference"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-canvas text-muted">
                <UserPlus size={18} />
              </span>
              <div>
                <h4 className="text-sm font-semibold text-ink">Notes</h4>
                <p className="text-xs text-muted">Internal context for this allocation.</p>
              </div>
            </div>
            <textarea
              value={form.notes}
              onChange={(event) => updateField('notes', event.target.value)}
              rows="3"
              className={textAreaClass}
              placeholder="Add allocation notes"
            />
          </section>

          <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col-reverse gap-3 border-t border-line bg-panel px-4 py-4 sm:-mx-5 sm:-mb-5 sm:flex-row sm:justify-end sm:px-5">
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
  const [realtors, setRealtors] = useState([])
  const [meta, setMeta] = useState(null)
  const [filters, setFilters] = useState({ status: '' })
  const [query, setQuery] = useState({ status: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [receiptDocument, setReceiptDocument] = useState(null)
  const [documentLoading, setDocumentLoading] = useState(false)
  const [documentError, setDocumentError] = useState('')

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
      const [clientsResponse, propertiesResponse, realtorsResponse] = await Promise.all([
        api.get('/clients', { params: { per_page: 100 } }),
        api.get('/properties', {
          params: { per_page: 100, status: 'available' },
        }),
        api.get('/realtors', { params: { per_page: 100, status: 'active' } }),
      ])

      setClients(clientsResponse.data.data)
      setProperties(propertiesResponse.data.data)
      setRealtors(realtorsResponse.data.data)
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

  async function viewReceiptDocument(allocation) {
    const receipt = allocationReceipt(allocation)

    if (!receipt?.id) {
      setError('No generated receipt is available for this allocation yet.')
      return
    }

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
                <th className="px-4 py-3 font-semibold">Realtor</th>
                <th className="px-4 py-3 font-semibold">Property</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Paid</th>
                <th className="px-4 py-3 font-semibold">Balance</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Receipt</th>
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
                  <td className="px-4 py-3 text-muted">
                    {realtorName(allocation)}
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
                  <td className="px-4 py-3 text-muted">
                    <span className="inline-flex items-center gap-2">
                      <ReceiptText size={15} />
                      {allocationReceipt(allocation)?.receipt_number || 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => viewReceiptDocument(allocation)}
                        disabled={!allocationReceipt(allocation)}
                        className="rounded-md border border-brand/20 bg-brand/5 p-2 text-brand hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="View receipt"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => viewReceiptDocument(allocation)}
                        disabled={!allocationReceipt(allocation)}
                        className="rounded-md border border-line p-2 text-muted hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Download receipt"
                      >
                        <Download size={16} />
                      </button>
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
                  <td className="px-4 py-10 text-center text-muted" colSpan="9">
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
          realtors={realtors}
          submitting={submitting}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
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
