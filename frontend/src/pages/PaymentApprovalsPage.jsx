import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileText,
  Loader2,
  ReceiptText,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
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
      billing: period
        ? `Period ${formatDate(period.period_start)} – ${formatDate(period.period_end)} · Due ${formatDate(period.due_date)}`
        : '',
    }
  }

  const charge = submission.service_charge
  return {
    property: charge?.rental_property || 'Property',
    billing: `${charge?.category || 'Service charge'} · Billing month ${charge?.billing_month || '—'}${charge?.description ? ` · ${charge.description}` : ''}`,
  }
}

function EvidenceThumbnail({ submission, loading, onOpen }) {
  const containerRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    let requested = false
    let objectUrl = null
    const container = containerRef.current

    async function loadPreview() {
      if (requested) return
      requested = true

      try {
        const response = await api.get(`/payment-approvals/${submission.id}/proof`, { responseType: 'blob' })
        objectUrl = URL.createObjectURL(response.data)
        if (active) {
          setPreview({ url: objectUrl, type: response.data.type })
          setFailed(false)
        } else {
          URL.revokeObjectURL(objectUrl)
        }
      } catch {
        if (active) setFailed(true)
      } finally {
        if (active) setPreviewLoading(false)
      }
    }

    if (container && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect()
          loadPreview()
        }
      }, { rootMargin: '120px' })
      observer.observe(container)

      return () => {
        active = false
        observer.disconnect()
        if (objectUrl) URL.revokeObjectURL(objectUrl)
      }
    }

    loadPreview()

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [submission.id])

  return (
    <button
      ref={containerRef}
      type="button"
      onClick={onOpen}
      aria-label={`View evidence for ${submission.client?.full_name || 'client'} payment`}
      title="View submitted evidence"
      className="group relative h-[72px] w-24 shrink-0 overflow-hidden rounded-md border border-line bg-canvas text-muted transition hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
    >
      {preview?.type?.startsWith('image/') ? (
        <img src={preview.url} alt="Submitted payment evidence thumbnail" className="h-full w-full object-cover" />
      ) : preview?.type === 'application/pdf' ? (
        <span className="flex h-full flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted"><FileText size={23} />PDF proof</span>
      ) : previewLoading ? (
        <span className="grid h-full place-items-center"><Loader2 size={18} className="animate-spin" /></span>
      ) : (
        <span className="flex h-full flex-col items-center justify-center gap-1 text-[10px] font-medium"><FileText size={21} />{failed ? 'Preview' : 'Evidence'}</span>
      )}
      <span className="absolute inset-0 grid place-items-center bg-ink/15 text-white transition-colors group-hover:bg-ink/45 group-focus-visible:bg-ink/45">
        <Eye size={21} className="drop-shadow" />
      </span>
      {loading ? <span className="absolute right-1 top-1 rounded bg-ink/70 p-1 text-white"><Loader2 size={12} className="animate-spin" /></span> : null}
    </button>
  )
}

function ReviewDialog({ submission, action, busy, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  const isRejecting = action === 'reject'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="review-dialog-title" className="w-full max-w-md rounded-lg border border-line bg-panel p-5 shadow-2xl">
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
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={busy} onClick={onClose} className="min-h-11 rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-canvas sm:min-h-0">Cancel</button>
          <button
            type="button"
            disabled={busy || (isRejecting && !reason.trim())}
            onClick={() => onSubmit(isRejecting ? reason.trim() : undefined)}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:min-h-0 ${isRejecting ? 'bg-red-600 hover:bg-red-700' : 'bg-brand hover:bg-brand-dark'}`}
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
            <a href={evidence.url} download={`payment-proof-${evidence.id}`} aria-label="Download payment evidence" className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-line px-2.5 py-2 text-sm font-medium text-ink hover:bg-canvas sm:px-3"><Download size={15} /><span className="hidden sm:inline">Download</span></a>
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
    <section className="mx-auto max-w-6xl space-y-5 pb-8">
      <header className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand text-white shadow-sm"><ShieldCheck size={21} /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Finance operations</p>
            <h2 className="mt-1 text-2xl font-semibold leading-tight text-ink">Payment approvals</h2>
            <p className="mt-1 text-sm text-muted">Verify submitted evidence before recording payments.</p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium text-muted"><ShieldCheck size={16} className="text-brand" />Admin review</span>
      </header>

      {pageError ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{pageError}</p> : null}
      {success ? <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p> : null}
      {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

      <div className="flex max-w-full overflow-x-auto rounded-lg border border-line bg-panel p-1" role="tablist" aria-label="Submission status">
        {statuses.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={status === value}
            onClick={() => updateFilter(setStatus, value)}
            className={`min-h-10 flex-1 rounded-md px-4 py-2 text-sm font-semibold capitalize transition-colors ${status === value ? 'bg-brand text-white shadow-sm' : 'text-muted hover:bg-canvas hover:text-ink'}`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="grid gap-3 rounded-lg border border-line bg-panel p-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <label className="relative block min-w-0">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="min-h-11 w-full rounded-md border border-line bg-canvas py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
            placeholder="Search client, property, or reference"
            value={search}
            onChange={(event) => updateFilter(setSearch, event.target.value)}
          />
        </label>
        <select
          aria-label="Filter payment category"
          className="min-h-11 rounded-md border border-line bg-canvas px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
          value={category}
          onChange={(event) => updateFilter(setCategory, event.target.value)}
        >
          <option value="">All categories</option>
          <option value="rental">Rental</option>
          <option value="service_charge">Service charge</option>
        </select>
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 rounded-lg border border-line bg-panel text-sm text-muted"><Loader2 size={18} className="animate-spin text-brand" />Loading submissions</div>
      ) : submissions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-panel px-5 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-canvas text-muted"><FileText size={22} /></span>
          <h3 className="mt-4 font-semibold text-ink">No {status} submissions</h3>
          <p className="mt-1 text-sm text-muted">Nothing matches these filters.</p>
        </div>
      ) : (
        <div className="space-y-3" aria-live="polite">
          {submissions.map((submission) => {
            const target = propertyAndTenancy(submission)
            return (
              <article key={submission.id} className="group overflow-hidden rounded-lg border border-line bg-panel shadow-sm transition-shadow hover:shadow-md">
                <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
                    <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-md ${submission.payment_category === 'rental' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                      <ReceiptText size={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="text-xl font-semibold tabular-nums text-ink">{formatMoney(submission.amount)}</h3>
                        <StatusBadge status={submission.status} />
                        <span className="text-xs font-medium text-muted">{submission.payment_category === 'rental' ? 'Rent' : 'Service charge'}</span>
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold text-ink">{submission.client?.full_name || 'Client unavailable'} <span className="font-normal text-muted">· {target.property}</span></p>
                      {target.billing ? <p className="mt-1 truncate text-xs text-muted">{target.billing}</p> : null}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                        <span className="inline-flex items-center gap-1"><Clock3 size={13} />Paid {formatDate(submission.paid_at)}</span>
                        <span>Ref <span className="font-medium text-ink">{submission.transaction_reference}</span></span>
                        <span>Submitted {formatDate(submission.submitted_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 lg:w-[21rem] lg:justify-end">
                    <EvidenceThumbnail
                      submission={submission}
                      loading={evidenceLoading === submission.id}
                      onOpen={() => showEvidence(submission)}
                    />
                    {submission.status === 'pending' ? (
                      <>
                        <div className="grid min-w-0 flex-1 gap-2">
                          <button type="button" onClick={() => setAction({ type: 'approve', submission })} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"><Check size={15} />Approve</button>
                          <button type="button" onClick={() => setAction({ type: 'reject', submission })} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"><XCircle size={15} />Reject</button>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
                {submission.status === 'rejected' && submission.rejection_reason ? <div className="border-t border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-800 sm:px-5">Reason: {submission.rejection_reason}</div> : null}
                {submission.recorded_payment ? <div className="border-t border-emerald-100 bg-emerald-50/60 px-4 py-2.5 text-xs text-emerald-900 sm:px-5">Recorded{submission.recorded_payment.receipt_number ? ` · Receipt ${submission.recorded_payment.receipt_number}` : ''}</div> : null}
              </article>
            )
          })}
        </div>
      )}

      {!loading && meta?.last_page > 1 ? (
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">Page {meta.current_page} of {meta.last_page} · {meta.total} submissions</p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-line px-3 py-2 text-sm disabled:opacity-50"><ChevronLeft size={16} />Previous</button>
            <button type="button" disabled={page >= meta.last_page} onClick={() => setPage((current) => current + 1)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-line px-3 py-2 text-sm disabled:opacity-50">Next<ChevronRight size={16} /></button>
          </div>
        </div>
      ) : null}

      {action ? <ReviewDialog submission={action.submission} action={action.type} busy={busy} onClose={() => setAction(null)} onSubmit={review} /> : null}
      <EvidenceDialog evidence={evidence} onClose={closeEvidence} />
    </section>
  )
}
