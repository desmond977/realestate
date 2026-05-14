import { Eye, Loader2, ReceiptText, Search, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { formatMoney } from '../utils/formatters'

function getApiError(error, fallback) {
  const errors = error.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  return error.response?.data?.message || fallback
}

function ReceiptDetailsModal({ receipt, onClose }) {
  const payment = receipt.payment

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4 py-6">
      <div className="w-full max-w-2xl rounded-lg border border-line bg-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-sm font-medium text-brand">Receipt</p>
            <h3 className="text-lg font-semibold text-ink">
              {receipt.receipt_number}
            </h3>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-muted hover:bg-canvas"
            onClick={onClose}
            aria-label="Close receipt details"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="grid gap-4 rounded-lg border border-line bg-canvas p-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase text-muted">Amount</p>
              <p className="mt-1 text-lg font-semibold text-ink">
                {formatMoney(payment?.amount)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted">Issued</p>
              <p className="mt-1 font-semibold text-ink">
                {receipt.issued_at
                  ? new Date(receipt.issued_at).toLocaleDateString()
                  : 'No date'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted">Method</p>
              <p className="mt-1 font-semibold text-ink">
                {payment?.payment_method || 'Not specified'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-line p-4">
              <p className="text-xs font-medium uppercase text-muted">Client</p>
              <p className="mt-2 font-semibold text-ink">
                {payment?.client?.full_name || 'Client'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {payment?.client?.email || 'No email'}
              </p>
            </div>
            <div className="rounded-lg border border-line p-4">
              <p className="text-xs font-medium uppercase text-muted">Property</p>
              <p className="mt-2 font-semibold text-ink">
                {payment?.property?.title || 'Property'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {payment?.property?.location || 'No location'}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-line p-4">
            <p className="text-xs font-medium uppercase text-muted">
              Transaction reference
            </p>
            <p className="mt-2 font-semibold text-ink">
              {payment?.transaction_reference || 'Not provided'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ReceiptsPage() {
  const [receipts, setReceipts] = useState([])
  const [meta, setMeta] = useState(null)
  const [filters, setFilters] = useState({ search: '' })
  const [query, setQuery] = useState({ search: '' })
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadReceipts = useCallback(async (params) => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/receipts', {
        params: {
          per_page: 20,
          search: params.search || undefined,
        },
      })

      setReceipts(response.data.data)
      setMeta(response.data.meta)
    } catch (err) {
      setError(getApiError(err, 'Receipts could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadReceipts(query)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadReceipts, query])

  function applyFilters(event) {
    event.preventDefault()
    setQuery(filters)
  }

  function resetFilters() {
    const nextFilters = { search: '' }
    setFilters(nextFilters)
    setQuery(nextFilters)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-brand">Receipts</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">
          Generated receipts
        </h2>
        <p className="mt-2 text-sm text-muted">
          Review receipt records created from confirmed payments.
        </p>
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
            placeholder="Search receipt, client, or property"
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

      <section className="rounded-lg border border-line bg-panel shadow-sm">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <ReceiptText size={18} className="text-brand" />
            <h3 className="text-base font-semibold text-ink">Receipts</h3>
          </div>
          <span className="text-sm text-muted">
            {meta?.total ?? receipts.length} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-canvas text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Receipt</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Property</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Issued</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt.id} className="border-t border-line">
                  <td className="px-4 py-3 font-semibold text-ink">
                    {receipt.receipt_number}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {receipt.payment?.client?.full_name || 'Client'}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {receipt.payment?.property?.title || 'Property'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">
                    {formatMoney(receipt.payment?.amount)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {receipt.issued_at
                      ? new Date(receipt.issued_at).toLocaleDateString()
                      : 'No date'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(receipt)}
                        className="rounded-md border border-line p-2 text-muted hover:bg-canvas hover:text-ink"
                        aria-label={`View ${receipt.receipt_number}`}
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && receipts.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-muted" colSpan="6">
                    No receipts found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 border-t border-line px-4 py-6 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" />
            Loading receipts
          </div>
        ) : null}
      </section>

      {selectedReceipt ? (
        <ReceiptDetailsModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      ) : null}
    </div>
  )
}
