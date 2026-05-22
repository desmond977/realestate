import {
  CreditCard,
  Download,
  Eye,
  Loader2,
  Plus,
  ReceiptText,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { ReceiptDocumentModal } from '../components/receipts/ReceiptDocument'
import { formatMoney } from '../utils/formatters'

const emptyForm = {
  allocation_id: '',
  amount: '',
  payment_method: '',
  transaction_reference: '',
  paid_at: '',
  notes: '',
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
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold capitalize ${
        styles[status] || styles.confirmed
      }`}
    >
      {status}
    </span>
  )
}

function realtorName(payment) {
  return payment?.realtor?.full_name || payment?.client?.realtor?.full_name || 'Direct'
}

function PaymentModal({ allocations, submitting, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm)
  const selectedAllocation = useMemo(
    () =>
      allocations.find(
        (allocation) => String(allocation.id) === String(form.allocation_id),
      ),
    [allocations, form.allocation_id],
  )

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    onSubmit({
      allocation_id: Number(form.allocation_id),
      amount: Number(form.amount),
      payment_method: form.payment_method || undefined,
      transaction_reference: form.transaction_reference || undefined,
      paid_at: form.paid_at || undefined,
      notes: form.notes || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-line bg-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-ink">Record payment</h3>
            <p className="text-sm text-muted">
              Add a confirmed payment to an active allocation.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-muted hover:bg-canvas"
            onClick={onClose}
            aria-label="Close payment form"
          >
            <X size={20} />
          </button>
        </div>

        <form className="space-y-5 px-5 py-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-ink">Allocation</span>
            <select
              value={form.allocation_id}
              onChange={(event) =>
                updateField('allocation_id', event.target.value)
              }
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
              required
            >
              <option value="">Select active allocation</option>
              {allocations.map((allocation) => (
                <option key={allocation.id} value={allocation.id}>
                  {allocation.client?.full_name || 'Client'} -{' '}
                  {allocation.property?.title || 'Property'} - Balance{' '}
                  {formatMoney(allocation.balance)}
                </option>
              ))}
            </select>
          </label>

          {selectedAllocation ? (
            <div className="grid gap-3 rounded-lg border border-line bg-canvas p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase text-muted">Total</p>
                <p className="mt-1 font-semibold text-ink">
                  {formatMoney(selectedAllocation.total_amount)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted">Paid</p>
                <p className="mt-1 font-semibold text-ink">
                  {formatMoney(selectedAllocation.amount_paid)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted">Balance</p>
                <p className="mt-1 font-semibold text-ink">
                  {formatMoney(selectedAllocation.balance)}
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-ink">Amount</span>
              <input
                type="number"
                min="0"
                max={selectedAllocation?.balance || undefined}
                step="0.01"
                value={form.amount}
                onChange={(event) => updateField('amount', event.target.value)}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Payment date</span>
              <input
                type="datetime-local"
                value={form.paid_at}
                onChange={(event) => updateField('paid_at', event.target.value)}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Method</span>
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
              Record payment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function PaymentsPage() {
  const [payments, setPayments] = useState([])
  const [allocations, setAllocations] = useState([])
  const [meta, setMeta] = useState(null)
  const [filters, setFilters] = useState({ allocation_id: '' })
  const [query, setQuery] = useState({ allocation_id: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [receiptDocument, setReceiptDocument] = useState(null)
  const [documentLoading, setDocumentLoading] = useState(false)
  const [documentError, setDocumentError] = useState('')

  const loadPayments = useCallback(async (params) => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/payments', {
        params: {
          per_page: 20,
          allocation_id: params.allocation_id || undefined,
        },
      })

      setPayments(response.data.data)
      setMeta(response.data.meta)
    } catch (err) {
      setError(getApiError(err, 'Payments could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAllocations = useCallback(async () => {
    try {
      const response = await api.get('/allocations', {
        params: { per_page: 100, status: 'active' },
      })

      setAllocations(response.data.data)
    } catch (err) {
      setError(getApiError(err, 'Active allocations could not be loaded.'))
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadPayments(query)
      loadAllocations()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadAllocations, loadPayments, query])

  function applyFilters(event) {
    event.preventDefault()
    setQuery(filters)
  }

  function resetFilters() {
    const nextFilters = { allocation_id: '' }
    setFilters(nextFilters)
    setQuery(nextFilters)
  }

  async function handleSubmit(payload) {
    setSubmitting(true)
    setError('')
    setNotice('')

    try {
      await api.post('/payments', payload)
      setNotice('Payment recorded successfully.')
      setModalOpen(false)
      await loadPayments(query)
      await loadAllocations()
    } catch (err) {
      setError(getApiError(err, 'Payment could not be recorded.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function viewReceiptDocument(payment) {
    if (!payment.receipt?.id) {
      setError('Receipt is not available for this payment yet.')
      return
    }

    setReceiptDocument(null)
    setDocumentError('')
    setDocumentLoading(true)

    try {
      const response = await api.get(`/receipts/${payment.receipt.id}/document`)
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
          <p className="text-sm font-medium text-brand">Payments</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            Payment history
          </h2>
          <p className="mt-2 text-sm text-muted">
            Record installment payments and review generated receipt numbers.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Plus size={17} />
          Record payment
        </button>
      </div>

      <form
        className="grid gap-3 rounded-lg border border-line bg-panel p-4 shadow-sm md:grid-cols-[1fr_auto_auto]"
        onSubmit={applyFilters}
      >
        <select
          value={filters.allocation_id}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              allocation_id: event.target.value,
            }))
          }
          className="rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
        >
          <option value="">All allocations</option>
          {allocations.map((allocation) => (
            <option key={allocation.id} value={allocation.id}>
              {allocation.client?.full_name || 'Client'} -{' '}
              {allocation.property?.title || 'Property'}
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
            <CreditCard size={18} className="text-brand" />
            <h3 className="text-base font-semibold text-ink">Payments</h3>
          </div>
          <span className="text-sm text-muted">
            {meta?.total ?? payments.length} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-canvas text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Realtor</th>
                <th className="px-4 py-3 font-semibold">Property</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Method</th>
                <th className="px-4 py-3 font-semibold">Receipt</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Paid at</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium text-ink">
                    {payment.client?.full_name || 'Client'}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {realtorName(payment)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {payment.property?.title || 'Property'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">
                    {formatMoney(payment.amount)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {payment.payment_method || 'Not specified'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-muted">
                      <ReceiptText size={15} />
                      {payment.receipt?.receipt_number || 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={payment.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {payment.paid_at
                      ? new Date(payment.paid_at).toLocaleString()
                      : 'No date'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => viewReceiptDocument(payment)}
                        disabled={!payment.receipt?.id}
                        className="inline-flex items-center gap-1 rounded-md border border-brand/20 bg-brand/5 px-2.5 py-2 text-sm font-semibold text-brand hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Eye size={16} />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => viewReceiptDocument(payment)}
                        disabled={!payment.receipt?.id}
                        className="rounded-md border border-line p-2 text-muted hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && payments.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-muted" colSpan="9">
                    No payments found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 border-t border-line px-4 py-6 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" />
            Loading payments
          </div>
        ) : null}
      </section>

      {modalOpen ? (
        <PaymentModal
          allocations={allocations}
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
