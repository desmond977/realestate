import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { formatMoney } from '../utils/formatters'

const statuses = ['pending', 'approved', 'rejected']

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—'
}

function StatusBadge({ status }) {
  const style = {
    pending: 'border-amber-200 bg-amber-50 text-amber-800',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rejected: 'border-red-200 bg-red-50 text-red-800',
  }[status] || 'border-line bg-canvas text-muted'

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${style}`}>{status}</span>
}

function propertyAndTenancy(submission) {
  if (submission.payment_category === 'rental') {
    const period = submission.rental_payment_period
    return {
      property: period?.rental_property || 'Rental property',
      tenancy: period
        ? `Agreement #${period.rental_agreement_id} · ${formatDate(period.lease_start_date)} – ${formatDate(period.lease_end_date)}`
        : 'Rental agreement unavailable',
      billing: period
        ? `Period ${formatDate(period.period_start)} – ${formatDate(period.period_end)} · Due ${formatDate(period.due_date)}`
        : '',
    }
  }

  const charge = submission.service_charge
  return {
    property: charge?.rental_property || 'Property',
    tenancy: charge
      ? `Agreement #${charge.rental_agreement_id} · ${formatDate(charge.lease_start_date)} – ${formatDate(charge.lease_end_date)}`
      : 'Service charge unavailable',
    billing: `${charge?.category || 'Service charge'}${charge?.description ? ` · ${charge.description}` : ''}`,
  }
}

function ReviewDialog({ submission, action, busy, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  const isRejecting = action === 'reject'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="review-dialog-title" className="w-full max-w-md rounded-xl border border-line bg-panel p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="review-dialog-title" className="text-lg font-semibold text-ink">{isRejecting ? 'Reject payment proof' : 'Approve payment proof'}</h2>
            <p className="mt-1 text-sm text-muted">{formatMoney(submission.amount)} · {submission.client?.full_name}</p>
          </div>
          <button type="button" aria-label="Close dialog" disabled={busy} onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-canvas disabled:opacity-50"><X size={18} /></button>
        </div>
        {isRejecting ? (
          <label className="mt-4 block text-sm font-medium text-ink">
            Rejection reason
            <textarea
              required
              maxLength={2000}
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2 text-sm font-normal"
              placeholder="Explain why the submitted proof cannot be accepted."
            />
          </label>
        ) : (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            This will record a confirmed payment, issue a receipt, and update the associated balance.
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-canvas">Cancel</button>
          <button
            type="button"
            disabled={busy || (isRejecting && !reason.trim())}
            onClick={() => onSubmit(isRejecting ? reason.trim() : undefined)}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 ${isRejecting ? 'bg-red-600 hover:bg-red-700' : 'bg-brand hover:bg-brand-dark'}`}
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : isRejecting ? <XCircle size={15} /> : <Check size={15} />}
            {busy ? 'Saving…' : isRejecting ? 'Reject submission' : 'Approve and record'}
          </button>
        </div>
      </section>
    </div>
  )
}

function EvidenceDialog({ evidence, onClose }) {
  if (!evidence) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-3 sm:p-6" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-label="Payment evidence" className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-semibold text-ink">Payment evidence</h2>
          <div className="flex items-center gap-2">
            <a href={evidence.url} download={`payment-proof-${evidence.id}`} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-canvas"><Download size={15} />Download</a>
            <button type="button" aria-label="Close evidence" onClick={onClose} className="rounded-md p-2 text-muted hover:bg-canvas"><X size={18} /></button>
          </div>
        </header>
        <div className="min-h-0 flex-1 bg-canvas">
          {evidence.type === 'application/pdf' ? (
            <iframe title="Submitted payment evidence PDF" src={evidence.url} className="h-full w-full" sandbox="" />
          ) : (
            <div className="grid h-full place-items-center overflow-auto p-4">
              <img src={evidence.url} alt="Submitted payment evidence" className="max-h-full max-w-full object-contain" />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export function PaymentApprovalsPage() {
  const [status, setStatus] = useState('pending')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ key: '', data: [], meta: null, error: '' })
  const [action, setAction] = useState(null)
  const [busy, setBusy] = useState(false)
  const [pageError, setPageError] = useState('')
  const [success, setSuccess] = useState('')
  const [evidence, setEvidence] = useState(null)
  const [evidenceLoading, setEvidenceLoading] = useState(null)
  const requestKey = `${status}|${category}|${search}|${page}`
  const fetchSubmissions = useCallback(async () => {
    const response = await api.get('/payment-approvals', {
      params: {
        status,
        payment_category: category || undefined,
        search: search.trim() || undefined,
        page,
        per_page: 20,
      },
    })
    return response.data
  }, [category, page, search, status])

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      fetchSubmissions()
        .then((response) => {
          if (active) setResult({ key: requestKey, data: response.data, meta: response.meta, error: '' })
        })
        .catch((requestError) => {
          if (active) {
            setResult({
              key: requestKey,
              data: [],
              meta: null,
              error: requestError.response?.data?.message || 'Unable to load payment approvals.',
            })
          }
        })
    }, 180)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [fetchSubmissions, requestKey])

  const loading = result.key !== requestKey
  const submissions = loading ? [] : result.data
  const meta = loading ? null : result.meta
  const error = loading ? '' : result.error

  async function showEvidence(submission) {
    setPageError('')
    setEvidenceLoading(submission.id)

    try {
      const response = await api.get(`/payment-approvals/${submission.id}/proof`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      setEvidence((current) => {
        if (current?.url) URL.revokeObjectURL(current.url)
        return { id: submission.id, url, type: response.data.type }
      })
    } catch (requestError) {
      setPageError(requestError.response?.data?.message || 'Unable to load payment evidence.')
    } finally {
      setEvidenceLoading(null)
    }
  }

  function closeEvidence() {
    setEvidence((current) => {
      if (current?.url) URL.revokeObjectURL(current.url)
      return null
    })
  }

  async function review(reason) {
    if (!action) return
    setBusy(true)
    setPageError('')
    setSuccess('')

    try {
      const endpoint = `/payment-approvals/${action.submission.id}/${action.type}`
      const response = action.type === 'reject'
        ? await api.post(endpoint, { rejection_reason: reason })
        : await api.post(endpoint)
      setSuccess(response.data.message || 'Payment submission reviewed.')
      setAction(null)
      const refreshed = await fetchSubmissions()
      setResult({ key: requestKey, data: refreshed.data, meta: refreshed.meta, error: '' })
    } catch (requestError) {
      const validationErrors = requestError.response?.data?.errors
      setPageError(
        validationErrors
          ? Object.values(validationErrors).flat().join(' ')
          : requestError.response?.data?.message || 'Unable to review payment submission.',
      )
      if (requestError.response?.status === 422) {
        const refreshed = await fetchSubmissions()
        setResult({ key: requestKey, data: refreshed.data, meta: refreshed.meta, error: '' })
      }
    } finally {
      setBusy(false)
    }
  }

  function updateFilter(setter, value) {
    setter(value)
    setPage(1)
    setSuccess('')
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand">Operations</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">Payment Approvals</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">Review client-submitted rental and service-charge evidence. Approval records the payment and receipt.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand"><ShieldCheck size={15} />Admin review</span>
      </header>

      {pageError ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{pageError}</p> : null}
      {success ? <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p> : null}
      {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {statuses.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => updateFilter(setStatus, value)}
            className={`rounded-md border px-3 py-2 text-sm font-medium capitalize ${status === value ? 'border-brand bg-brand text-white' : 'border-line bg-panel text-muted hover:bg-canvas'}`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="relative block">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="w-full rounded-md border border-line bg-panel py-2.5 pl-10 pr-3 text-sm"
            placeholder="Search client, property, or reference"
            value={search}
            onChange={(event) => updateFilter(setSearch, event.target.value)}
          />
        </label>
        <select
          aria-label="Filter payment category"
          className="rounded-md border border-line bg-panel px-3 py-2.5 text-sm"
          value={category}
          onChange={(event) => updateFilter(setCategory, event.target.value)}
        >
          <option value="">All categories</option>
          <option value="rental">Rental</option>
          <option value="service_charge">Service charge</option>
        </select>
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted"><Loader2 size={18} className="animate-spin" />Loading submissions</div>
      ) : submissions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-panel px-5 py-12 text-center">
          <FileText size={28} className="mx-auto text-muted" />
          <h3 className="mt-3 font-semibold text-ink">No {status} submissions</h3>
          <p className="mt-1 text-sm text-muted">There are no submissions matching the selected filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((submission) => {
            const target = propertyAndTenancy(submission)
            return (
              <article key={submission.id} className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-ink">{formatMoney(submission.amount)}</h3>
                      <StatusBadge status={submission.status} />
                      <span className="rounded-full bg-canvas px-2.5 py-1 text-xs capitalize text-muted">
                        {submission.payment_category === 'rental' ? 'Rental payment' : 'Service charge'}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase text-muted">Client</p>
                        <p className="mt-1 font-semibold text-ink">{submission.client?.full_name || 'Client unavailable'}</p>
                        <p className="text-xs text-muted">{submission.client?.email}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-muted">Property / tenancy</p>
                        <p className="mt-1 font-semibold text-ink">{target.property}</p>
                        <p className="text-xs text-muted">{target.tenancy}</p>
                        {target.billing ? <p className="mt-1 text-xs text-muted">{target.billing}</p> : null}
                      </div>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-line pt-3 text-sm sm:grid-cols-4">
                      <div><dt className="text-xs text-muted">Payment date</dt><dd className="mt-1 font-medium text-ink">{formatDate(submission.paid_at)}</dd></div>
                      <div><dt className="text-xs text-muted">Reference</dt><dd className="mt-1 break-all font-medium text-ink">{submission.transaction_reference}</dd></div>
                      <div><dt className="text-xs text-muted">Submitted</dt><dd className="mt-1 font-medium text-ink">{formatDate(submission.submitted_at)}</dd></div>
                      <div><dt className="text-xs text-muted">Reviewed</dt><dd className="mt-1 font-medium text-ink">{formatDate(submission.reviewed_at)}</dd></div>
                    </dl>
                    {submission.status === 'rejected' && submission.rejection_reason ? (
                      <p className="mt-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">Rejection reason: {submission.rejection_reason}</p>
                    ) : null}
                    {submission.recorded_payment ? (
                      <p className="mt-3 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                        Recorded payment #{submission.recorded_payment.id}
                        {submission.recorded_payment.receipt_number ? ` · Receipt ${submission.recorded_payment.receipt_number}` : ''}
                        {submission.reviewer?.name ? ` · Reviewed by ${submission.reviewer.name}` : ''}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                    <button
                      type="button"
                      disabled={evidenceLoading === submission.id}
                      onClick={() => showEvidence(submission)}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-canvas disabled:opacity-60"
                    >
                      {evidenceLoading === submission.id ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
                      Inspect evidence
                    </button>
                    {submission.status === 'pending' ? (
                      <>
                        <button type="button" onClick={() => setAction({ type: 'approve', submission })} className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"><Check size={15} />Approve</button>
                        <button type="button" onClick={() => setAction({ type: 'reject', submission })} className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"><XCircle size={15} />Reject</button>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {!loading && meta?.last_page > 1 ? (
        <div className="flex items-center justify-between rounded-lg border border-line bg-panel px-4 py-3">
          <p className="text-sm text-muted">Page {meta.current_page} of {meta.last_page} · {meta.total} submissions</p>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm disabled:opacity-50"><ChevronLeft size={16} />Previous</button>
            <button type="button" disabled={page >= meta.last_page} onClick={() => setPage((current) => current + 1)} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm disabled:opacity-50">Next<ChevronRight size={16} /></button>
          </div>
        </div>
      ) : null}

      {action ? <ReviewDialog submission={action.submission} action={action.type} busy={busy} onClose={() => setAction(null)} onSubmit={review} /> : null}
      <EvidenceDialog evidence={evidence} onClose={closeEvidence} />
    </section>
  )
}
