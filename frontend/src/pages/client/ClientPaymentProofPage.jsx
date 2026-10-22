import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, Download, FileText, Loader2, Upload, XCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { paymentProofSubmissionsApi } from '../../services/clientApi'
import { formatMoney } from '../../utils/formatters'

const initialOptions = { rental_payment_periods: [], service_charges: [] }

function formatDate(value) {
  return value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString() : '—'
}

function StatusBadge({ status }) {
  const style = {
    pending: 'border-amber-200 bg-amber-50 text-amber-800',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rejected: 'border-red-200 bg-red-50 text-red-800',
  }[status] || 'border-line bg-canvas text-muted'
  const Icon = status === 'approved' ? CheckCircle2 : status === 'rejected' ? XCircle : Clock3

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${style}`}>
      <Icon size={14} />
      {status}
    </span>
  )
}

function submissionTarget(submission) {
  if (submission.payment_category === 'rental') {
    const period = submission.rental_payment_period
    return `${period?.rental_property || 'Rental property'} · ${formatDate(period?.period_start)} – ${formatDate(period?.period_end)}`
  }

  const charge = submission.service_charge
  return `${charge?.rental_property || 'Property'} · ${charge?.category || 'Service charge'}${charge?.description ? ` — ${charge.description}` : ''}`
}

export function ClientPaymentProofPage() {
  const [options, setOptions] = useState(initialOptions)
  const [submissions, setSubmissions] = useState([])
  const [historyMeta, setHistoryMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('rental')
  const [targetId, setTargetId] = useState('')
  const [amount, setAmount] = useState('')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const formRef = useRef(null)

  const loadData = useCallback(async (pageNumber = page) => {
    const [optionsResponse, submissionsResponse] = await Promise.all([
      paymentProofSubmissionsApi.options(),
      paymentProofSubmissionsApi.list(pageNumber),
    ])
    setOptions(optionsResponse.data.data || initialOptions)
    setSubmissions(submissionsResponse.data.data || [])
    setHistoryMeta(submissionsResponse.data.meta || null)
  }, [page])

  useEffect(() => {
    let active = true

    Promise.all([
      paymentProofSubmissionsApi.options(),
      paymentProofSubmissionsApi.list(page),
    ])
      .then(([optionsResponse, submissionsResponse]) => {
        if (active) {
          setOptions(optionsResponse.data.data || initialOptions)
          setSubmissions(submissionsResponse.data.data || [])
          setHistoryMeta(submissionsResponse.data.meta || null)
          setError('')
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load payment submission data.')
      })
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [page])

  const targets = category === 'rental' ? options.rental_payment_periods : options.service_charges

  function selectTarget(value) {
    setTargetId(value)
    const target = targets.find((item) => String(item.id) === value)
    setAmount(target?.available_amount ? String(target.available_amount) : '')
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    const payload = new FormData()
    payload.append('payment_category', category)
    payload.append(category === 'rental' ? 'rental_payment_period_id' : 'service_charge_id', targetId)
    payload.append('amount', amount)
    payload.append('paid_at', paidAt)
    payload.append('transaction_reference', reference.trim())
    if (file) payload.append('proof_of_payment', file)

    try {
      const response = await paymentProofSubmissionsApi.submit(payload)
      setSuccess(response.data.message || 'Payment proof submitted for review.')
      setReference('')
      setFile(null)
      formRef.current?.reset()
      setPaidAt(new Date().toISOString().slice(0, 10))
      setTargetId('')
      setAmount('')
      setPage(1)
      if (page === 1) await loadData(1)
    } catch (requestError) {
      const validationErrors = requestError.response?.data?.errors
      setError(
        validationErrors
          ? Object.values(validationErrors).flat().join(' ')
          : requestError.response?.data?.message || 'Payment proof could not be submitted.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function downloadProof(submission) {
    setError('')
    setDownloadingId(submission.id)

    try {
      const response = await paymentProofSubmissionsApi.proof(submission.id)
      const url = URL.createObjectURL(response.data)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `payment-proof-${submission.id}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Payment evidence could not be downloaded.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-brand">Client payments</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Submit payment proof</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Submit evidence for a rental period or service charge. Submissions remain pending and do not change your confirmed balances until reviewed.
        </p>
      </header>

      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      {success ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p> : null}

      <section className="rounded-lg border border-line bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-ink">New submission</h2>
        <form ref={formRef} className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            Payment category
            <select
              className="rounded-md border border-line bg-white px-3 py-2.5 font-normal"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value)
                setTargetId('')
                setAmount('')
              }}
            >
              <option value="rental">Rental payment</option>
              <option value="service_charge">Service charge</option>
            </select>
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-ink">
            {category === 'rental' ? 'Rental payment period' : 'Service charge'}
            <select
              required
              className="min-w-0 rounded-md border border-line bg-white px-3 py-2.5 font-normal"
              value={targetId}
              onChange={(event) => selectTarget(event.target.value)}
              disabled={loading || targets.length === 0}
            >
              <option value="">Select a record</option>
              {targets.map((target) => (
                <option key={target.id} value={target.id}>
                  {category === 'rental'
                    ? `${target.property_name || 'Rental property'} · ${formatDate(target.period_start)} – ${formatDate(target.period_end)} · Remaining ${formatMoney(target.available_amount)}`
                    : `${target.property_name || 'Property'} · ${target.category || 'Service charge'} · ${formatDate(target.due_date)} · Remaining ${formatMoney(target.available_amount)}`}
                </option>
              ))}
            </select>
            {targets.length === 0 && !loading ? (
              <span className="text-xs font-normal text-muted">No outstanding eligible records are available.</span>
            ) : null}
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-ink">
            Amount paid
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              max={targets.find((item) => String(item.id) === targetId)?.available_amount}
              className="rounded-md border border-line bg-white px-3 py-2.5 font-normal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-ink">
            Payment date
            <input
              required
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              className="rounded-md border border-line bg-white px-3 py-2.5 font-normal"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-ink sm:col-span-2">
            Transaction reference
            <input
              required
              maxLength="255"
              className="rounded-md border border-line bg-white px-3 py-2.5 font-normal"
              placeholder="Bank or transfer reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-ink sm:col-span-2">
            Proof of payment
            <input
              required
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              className="block w-full rounded-md border border-line bg-white px-3 py-2 text-sm font-normal file:mr-3 file:rounded file:border-0 file:bg-canvas file:px-3 file:py-1.5 file:text-sm file:font-medium"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            <span className="text-xs font-normal text-muted">JPG, PNG, WEBP, or PDF. Maximum file size: 5 MB.</span>
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting || loading || targets.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {submitting ? 'Submitting…' : 'Submit for review'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-ink">Submission history</h2>
          <p className="mt-1 text-sm text-muted">View status and any reason provided for a rejected submission.</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted"><Loader2 size={17} className="animate-spin" />Loading submissions</div>
        ) : submissions.length === 0 ? (
          <div className="p-10 text-center">
            <FileText size={28} className="mx-auto text-muted" />
            <p className="mt-3 text-sm text-muted">You have not submitted payment proof yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {submissions.map((submission) => (
              <li key={submission.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{formatMoney(submission.amount)}</p>
                      <StatusBadge status={submission.status} />
                      <span className="rounded-full bg-canvas px-2.5 py-1 text-xs capitalize text-muted">
                        {submission.payment_category === 'rental' ? 'Rental payment' : 'Service charge'}
                      </span>
                    </div>
                    <p className="mt-2 break-words text-sm text-ink">{submissionTarget(submission)}</p>
                    <p className="mt-1 text-xs text-muted">
                      Paid {formatDate(submission.paid_at)} · Reference {submission.transaction_reference} · Submitted {formatDate(submission.submitted_at)}
                    </p>
                    {submission.status === 'rejected' && submission.rejection_reason ? (
                      <p className="mt-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">
                        Reason: {submission.rejection_reason}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadProof(submission)}
                    disabled={downloadingId === submission.id}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-canvas disabled:opacity-60"
                  >
                    {downloadingId === submission.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                    Evidence
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!loading && historyMeta?.last_page > 1 ? (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 sm:px-5">
            <p className="text-xs text-muted">Page {historyMeta.current_page} of {historyMeta.last_page} · {historyMeta.total} submissions</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => {
                  setLoading(true)
                  setPage((current) => current - 1)
                }}
                className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-sm disabled:opacity-50"
              >
                <ChevronLeft size={15} /> Previous
              </button>
              <button
                type="button"
                disabled={page >= historyMeta.last_page}
                onClick={() => {
                  setLoading(true)
                  setPage((current) => current + 1)
                }}
                className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-sm disabled:opacity-50"
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
