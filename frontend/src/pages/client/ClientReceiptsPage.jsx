import { Download, Eye, Loader2, Printer, ReceiptText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ReceiptDocumentModal } from '../../components/receipts/ReceiptDocument'
import { receiptsApi } from '../../services/clientApi'
import { formatMoney } from '../../utils/formatters'
import { formatPaymentDuration } from '../../utils/paymentDuration'

function getApiError(error, fallback) {
  const errors = error.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  return error.response?.data?.message || fallback
}

function receiptDate(receipt) {
  return receipt.issued_at ? new Date(receipt.issued_at).toLocaleDateString() : 'No date'
}

function receiptProperty(receipt) {
  return receipt.snapshot?.property?.title || receipt.payment?.property?.title || receipt.payment?.allocation?.property?.title || 'Property'
}

function receiptAmount(receipt) {
  return receipt.snapshot?.payment?.amount ?? receipt.payment?.amount
}

function receiptDuration(receipt) {
  return formatPaymentDuration(receipt.snapshot?.allocation || receipt.payment?.allocation)
}

export function ClientReceiptsPage() {
  const [receipts, setReceipts] = useState([])
  const [receiptDocument, setReceiptDocument] = useState(null)
  const [documentLoading, setDocumentLoading] = useState(false)
  const [documentError, setDocumentError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    receiptsApi
      .list()
      .then((response) => active && setReceipts(response.data.receipts || []))
      .catch((err) => active && setError(getApiError(err, 'Receipts could not be loaded.')))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [])

  async function viewReceiptDocument(receipt) {
    setReceiptDocument(null)
    setDocumentError('')
    setDocumentLoading(true)

    try {
      const response = await receiptsApi.document(receipt.id)
      setReceiptDocument(response.data.data)
    } catch (err) {
      setDocumentError(getApiError(err, 'Receipt document could not be loaded.'))
    } finally {
      setDocumentLoading(false)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand">Receipts</p>
          <h1 className="mt-1 text-xl font-semibold text-ink md:text-2xl">Transaction documents</h1>
          <p className="mt-1 hidden max-w-2xl text-sm text-muted sm:block">
            View, print, and download your official payment receipts.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-muted shadow-sm md:text-sm">
          <ReceiptText size={16} className="text-brand" />
          {receipts.length} total
        </span>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-line px-3 py-2.5 md:px-4 md:py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-brand/10 text-brand md:h-9 md:w-9">
              <ReceiptText size={17} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-ink">Receipts</h2>
              <p className="hidden text-xs text-muted sm:block">Your confirmed payment documents</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-line md:hidden">
          {receipts.map((receipt) => (
            <article key={receipt.id} className="bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{receipt.receipt_number}</p>
                  <p className="mt-0.5 text-xs text-muted">{receiptDate(receipt)}</p>
                </div>
                <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Confirmed
                </span>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5 text-xs">
                <div className="min-w-0 rounded-md bg-canvas p-2">
                  <p className="text-[10px] uppercase text-muted">Property</p>
                  <p className="mt-0.5 truncate font-medium text-ink">{receiptProperty(receipt)}</p>
                </div>
                <div className="min-w-0 rounded-md bg-canvas p-2">
                  <p className="text-[10px] uppercase text-muted">Amount</p>
                  <p className="mt-0.5 truncate font-semibold text-ink">{formatMoney(receiptAmount(receipt))}</p>
                </div>
                <div className="min-w-0 rounded-md bg-canvas p-2">
                  <p className="text-[10px] uppercase text-muted">Duration</p>
                  <p className="mt-0.5 truncate font-semibold text-ink">{receiptDuration(receipt)}</p>
                </div>
              </div>

              <div className="mt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => viewReceiptDocument(receipt)}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-brand/20 bg-brand/5 px-2 text-xs font-semibold text-brand"
                >
                  <Eye size={14} />
                  View
                </button>
                <button
                  type="button"
                  onClick={() => viewReceiptDocument(receipt)}
                  className="grid h-8 w-8 place-items-center rounded-md border border-line bg-white text-muted"
                  aria-label={`Print ${receipt.receipt_number}`}
                >
                  <Printer size={14} />
                </button>
              </div>
            </article>
          ))}

          {!loading && receipts.length === 0 ? (
            <div className="px-4 py-10 text-center text-muted">No receipts found.</div>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Receipt</th>
                <th className="px-4 py-3 font-semibold">Property</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 font-semibold">Issued</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt.id} className="border-b border-line/80 transition hover:bg-brand/5">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{receipt.receipt_number}</p>
                    <p className="mt-1 inline-flex rounded-md bg-canvas px-2 py-1 text-xs font-medium text-muted">
                      ID #{receipt.id}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex max-w-[240px] rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs font-medium text-muted">
                      {receiptProperty(receipt)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">{formatMoney(receiptAmount(receipt))}</td>
                  <td className="px-4 py-3 text-muted">{receiptDuration(receipt)}</td>
                  <td className="px-4 py-3 text-muted">{receiptDate(receipt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => viewReceiptDocument(receipt)}
                        className="inline-flex items-center gap-1 rounded-md border border-brand/20 bg-brand/5 px-2.5 py-2 text-sm font-semibold text-brand hover:bg-brand/10"
                        aria-label={`View ${receipt.receipt_number}`}
                      >
                        <Eye size={16} />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => viewReceiptDocument(receipt)}
                        className="rounded-md border border-line p-2 text-muted hover:bg-canvas hover:text-ink"
                        aria-label={`Print ${receipt.receipt_number}`}
                      >
                        <Printer size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => viewReceiptDocument(receipt)}
                        className="rounded-md border border-line p-2 text-muted hover:bg-canvas hover:text-ink"
                        aria-label={`Download ${receipt.receipt_number}`}
                      >
                        <Download size={16} />
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

      {receiptDocument || documentLoading || documentError ? (
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
