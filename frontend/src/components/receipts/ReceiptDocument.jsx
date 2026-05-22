import { Download, Loader2, Printer, ReceiptText, X } from 'lucide-react'
import { formatMoney } from '../../utils/formatters'

function formatDate(value, withTime = false) {
  if (!value) return '-'

  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

function statusClass(status, tone = 'default') {
  const normalized = String(status || '').toLowerCase()

  if (['available', 'active', 'confirmed', 'fully_paid', 'completed', 'cleared'].includes(normalized)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (['reserved', 'installment', 'pending'].includes(normalized) || tone === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  if (['sold', 'failed', 'overdue', 'cancelled'].includes(normalized) || tone === 'danger') {
    return 'border-red-200 bg-red-50 text-red-700'
  }

  return 'border-slate-200 bg-slate-50 text-slate-700'
}

function StatusBadge({ status, children, tone }) {
  return (
    <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(status, tone)}`}>
      {children || String(status || 'pending').replaceAll('_', ' ')}
    </span>
  )
}

function InfoBlock({ label, value, accent }) {
  return (
    <div className="rounded-md bg-canvas p-3">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${accent || 'text-ink'}`}>{value || '-'}</p>
    </div>
  )
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
    </div>
  )
}

export function ReceiptDocument({ document }) {
  const summary = document.installment_summary || {}
  const balance = Number(summary.remaining_balance || 0)
  const progress = Number(summary.progress_percentage || 0)

  return (
    <article className="receipt-print overflow-hidden rounded-lg border border-line bg-white text-ink shadow-sm">
      <header className="border-b border-line bg-panel px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-brand text-lg font-bold text-white shadow-sm">
              T
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-ink">{document.company?.name || 'TerraOps'}</h1>
              <p className="mt-1 text-sm text-muted">{document.company?.tagline}</p>
              <p className="mt-3 max-w-md text-xs leading-5 text-muted">{document.company?.address || 'Company address not configured'}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span>{document.company?.phone || 'No phone'}</span>
                <span>{document.company?.email || 'No email'}</span>
              </div>
            </div>
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <p className="text-xs font-semibold uppercase text-muted">{document.document_type || 'Receipt'}</p>
            <p className="mt-1 text-lg font-semibold text-ink">{document.receipt?.number}</p>
            <p className="mt-2 text-xs text-muted">Generated {formatDate(document.receipt?.generated_at, true)}</p>
            <div className="mt-3 flex justify-start sm:justify-end">
              <StatusBadge status={document.payment?.payment_status} />
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-3">
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-muted">Client</p>
          <h2 className="mt-2 text-base font-semibold text-ink">{document.client?.full_name || 'Client'}</h2>
          <p className="mt-2 text-sm text-muted">{document.client?.phone || 'No phone'}</p>
          <p className="text-sm text-muted">{document.client?.email || 'No email'}</p>
          <p className="mt-2 text-xs leading-5 text-muted">{document.client?.address || 'No address'}</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-muted">Realtor</p>
          <h2 className="mt-2 text-base font-semibold text-ink">{document.realtor?.full_name || 'Direct client'}</h2>
          <p className="mt-2 text-sm text-muted">{document.realtor?.company_name || 'Independent'}</p>
          <p className="text-sm text-muted">{document.realtor?.phone || 'No phone'}</p>
          <p className="text-sm text-muted">{document.realtor?.email || 'No email'}</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-muted">Property</p>
          <h2 className="mt-2 text-base font-semibold text-ink">{document.property?.title || 'Property'}</h2>
          <p className="mt-2 text-sm text-muted">{document.property?.location || 'No location'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={document.property?.status} />
            <span className="rounded-md bg-canvas px-2.5 py-1 text-xs font-semibold text-muted">
              {document.property?.land_size || 'No land size'}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 px-5 pb-5 sm:px-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <SectionTitle title="Installment progress" subtitle="Payment completion and outstanding balance." />
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h3 className="text-xl font-semibold text-ink">
                {formatMoney(summary.total_paid || 0)} / {formatMoney(summary.total_amount || 0)} Paid
              </h3>
            </div>
            <StatusBadge status={balance > 0 ? 'outstanding' : 'fully_paid'} tone={balance > 0 ? 'danger' : undefined}>
              {balance > 0 ? `${formatMoney(balance)} outstanding` : 'Fully cleared'}
            </StatusBadge>
          </div>
          <div className="mt-4 h-3 rounded-full bg-canvas">
            <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <InfoBlock label="Progress" value={`${progress}% Complete`} />
            <InfoBlock label="Payments" value={summary.payments_count || 0} />
            <InfoBlock label="Total" value={formatMoney(summary.total_amount || 0)} />
            <InfoBlock label="Balance" value={formatMoney(balance)} accent={balance > 0 ? 'text-red-600' : 'text-emerald-700'} />
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <SectionTitle title="Current payment" subtitle="Latest transaction attached to this receipt." />
          <div className="mt-4 grid gap-3">
            <InfoBlock label="Amount paid" value={formatMoney(document.payment?.amount || 0)} accent="text-brand" />
            <InfoBlock label="Method" value={document.payment?.method || 'Not specified'} />
            <InfoBlock label="Reference" value={document.payment?.reference || 'Not provided'} />
            <InfoBlock label="Paid at" value={formatDate(document.payment?.paid_at, true)} />
          </div>
        </div>
      </section>

      <section className="px-5 pb-5 sm:px-6">
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase text-muted">Allocation</p>
              <h3 className="mt-1 text-base font-semibold text-ink">{document.allocation?.reference || 'Allocation summary'}</h3>
            </div>
            <StatusBadge status={document.allocation?.status || document.property?.status} />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <InfoBlock label="Allocation date" value={document.allocation?.allocated_at || '-'} />
            <InfoBlock label="Property type" value={document.property?.type || '-'} />
            <InfoBlock label="Document issued" value={document.property?.document_type || '-'} />
            <InfoBlock label="Property price" value={formatMoney(document.property?.price || 0)} />
          </div>
        </div>
      </section>

      <section className="px-5 pb-5 sm:px-6">
        <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <div className="border-b border-line bg-canvas px-4 py-3">
            <h3 className="text-sm font-semibold text-ink">Payment history</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr className="border-b border-line">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {document.payment_history?.map((payment) => (
                  <tr key={payment.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-muted">{formatDate(payment.date, true)}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{formatMoney(payment.amount)}</td>
                    <td className="px-4 py-3 text-muted">{payment.method || '-'}</td>
                    <td className="px-4 py-3 text-muted">{payment.reference || payment.receipt_number || '-'}</td>
                    <td className="px-4 py-3"><StatusBadge status={payment.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <footer className="grid gap-6 border-t border-line bg-panel px-5 py-5 sm:grid-cols-[1fr_220px] sm:px-6">
        <div>
          <p className="text-sm font-semibold text-ink">Thank you for your business.</p>
          <div className="mt-2 space-y-1 text-xs leading-5 text-muted">
            {document.notes?.map((note) => <p key={note}>{note}</p>)}
          </div>
        </div>
        <div className="pt-8">
          <div className="border-t border-ink pt-2 text-center text-xs font-semibold text-muted">
            Authorized signature
          </div>
        </div>
      </footer>
    </article>
  )
}

export function ReceiptDocumentModal({ document, loading, error, onClose }) {
  function printDocument() {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 px-0 py-0 backdrop-blur-sm sm:px-4 sm:py-6">
      <div className="mx-auto min-h-screen w-full max-w-6xl border border-line bg-canvas shadow-2xl sm:min-h-0 sm:rounded-lg">
        <div className="receipt-actions sticky top-0 z-10 flex flex-col gap-3 border-b border-line bg-panel px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-brand/10 text-brand">
              <ReceiptText size={19} />
            </span>
            <div>
            <p className="text-sm font-medium text-brand">Receipt document</p>
            <h3 className="mt-1 text-lg font-semibold text-ink">{document?.receipt?.number || 'Transaction document'}</h3>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={printDocument} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-canvas">
              <Printer size={16} />
              Print
            </button>
            <button type="button" onClick={printDocument} className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              <Download size={16} />
              Download PDF
            </button>
            <button type="button" onClick={onClose} className="rounded-md p-2 text-muted hover:bg-canvas" aria-label="Close receipt document">
              <X size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center gap-2 text-sm text-muted">
            <Loader2 size={18} className="animate-spin" />
            Loading receipt document
          </div>
        ) : error ? (
          <div className="m-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : document ? (
          <div className="p-4 sm:p-5">
            <ReceiptDocument document={document} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
