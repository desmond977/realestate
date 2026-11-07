import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader2, Upload } from 'lucide-react'
import { formatMoney } from '../../utils/formatters'
import { paymentProofSubmissionsApi, rentalPaymentsApi } from '../../services/clientApi'

function date(value) {
  return value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString() : '—'
}

export function ClientRentPaymentsPage() {
  const location = useLocation()
  const [periods, setPeriods] = useState([])
  const [options, setOptions] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [summary, setSummary] = useState({ total_due: 0, total_paid: 0, outstanding: 0 })
  const [periodId, setPeriodId] = useState('')
  const [amount, setAmount] = useState('')
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [receipt, setReceipt] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([rentalPaymentsApi.list(), paymentProofSubmissionsApi.options(), paymentProofSubmissionsApi.list(1)])
      .then(([periodResponse, optionsResponse, submissionsResponse]) => {
        if (!active) return
        setPeriods(periodResponse.data.data.periods || [])
        setSummary({ total_due: periodResponse.data.data.total_due || 0, total_paid: periodResponse.data.data.total_paid || 0, outstanding: periodResponse.data.data.outstanding || 0 })
        setOptions(optionsResponse.data.data.rental_payment_periods || [])
        setSubmissions((submissionsResponse.data.data || []).filter((item) => item.payment_category === 'rental'))
      })
      .catch((requestError) => active && setError(requestError.response?.data?.message || 'Unable to load your rent payments.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (location.hash === '#rental-receipts' && !loading) {
      document.getElementById('rental-receipts')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [loading, location.hash])

  const available = useMemo(() => options.find((item) => String(item.id) === periodId)?.available_amount || 0, [options, periodId])
  const monthByPeriod = new Map(periods.map((period) => [period.id, `${period.period_start} ${period.period_end}`]))

  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')
    const payload = new FormData()
    payload.append('payment_category', 'rental')
    payload.append('rental_payment_period_id', periodId)
    payload.append('amount', amount)
    payload.append('paid_at', paidAt)
    payload.append('transaction_reference', reference.trim())
    if (file) payload.append('proof_of_payment', file)
    try {
      const response = await paymentProofSubmissionsApi.submit(payload)
      setSuccess(response.data.message || 'Rent payment proof submitted for review.')
      setPeriodId(''); setAmount(''); setReference(''); setFile(null)
    } catch (requestError) {
      const validationErrors = requestError.response?.data?.errors
      setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : requestError.response?.data?.message || 'Proof could not be submitted.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <header><p className="text-sm font-medium text-brand">Client payments</p><h1 className="mt-1 text-2xl font-semibold text-ink">Rent Payments</h1><p className="mt-1 text-sm text-muted">Rent charges, confirmed payments, and rental receipts. Service charges are listed separately.</p></header>
      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      {success ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p> : null}
      <div className="grid gap-3 sm:grid-cols-3">{[['Rent due', summary.total_due], ['Rent paid', summary.total_paid], ['Outstanding rent', summary.outstanding]].map(([label, value]) => <div key={label} className="rounded-lg border border-line bg-white p-4"><p className="text-xs font-medium uppercase text-muted">{label}</p><p className="mt-2 text-2xl font-semibold">{formatMoney(value)}</p></div>)}</div>
      <section className="overflow-hidden rounded-lg border border-line bg-white"><div className="border-b border-line px-4 py-3"><h2 className="font-semibold text-ink">Rent payment history</h2></div>{loading ? <div className="p-6 text-sm text-muted"><Loader2 size={16} className="mr-2 inline animate-spin" />Loading rent periods</div> : periods.length ? <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-canvas text-xs uppercase text-muted"><tr><th className="px-4 py-3">Property / period</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Paid</th><th className="px-4 py-3">Balance</th><th className="px-4 py-3">Status</th><th id="rental-receipts" className="px-4 py-3">Receipts</th></tr></thead><tbody className="divide-y divide-line">{periods.map((period) => <tr key={period.id} className="align-top"><td className="px-4 py-3"><p className="font-medium text-ink">{period.rental_agreement?.rental_property?.name}</p><p className="text-xs text-muted">{date(period.period_start)} – {date(period.period_end)}</p></td><td className="px-4 py-3">{formatMoney(period.amount_due)}</td><td className="px-4 py-3">{formatMoney(period.amount_paid)}</td><td className="px-4 py-3">{formatMoney(period.balance)}</td><td className="px-4 py-3 capitalize">{period.status}</td><td className="px-4 py-3">{period.payments?.length ? period.payments.map((payment) => <div key={payment.id} className="mb-1">{payment.receipt ? <button type="button" onClick={() => setReceipt(payment.receipt)} className="font-medium text-brand hover:underline">View {payment.receipt.receipt_number}</button> : <span>Confirmed payment</span>} · {date(payment.paid_at)}</div>) : <span className="text-muted">—</span>}</td></tr>)}</tbody></table></div> : <p className="p-6 text-sm text-muted">No rental payment periods found.</p>}</section>
      {options.length ? <section className="rounded-lg border border-line bg-white p-4 sm:p-5"><h2 className="font-semibold text-ink">Submit rent payment proof</h2><p className="mt-1 text-sm text-muted">Pending submissions do not reduce confirmed rent balances.</p><form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium">Rental period<select required value={periodId} onChange={(event) => { const id = event.target.value; setPeriodId(id); setAmount(String(options.find((option) => String(option.id) === id)?.available_amount || '')) }} className="rounded-md border border-line px-3 py-2"><option value="">Select period</option>{options.map((option) => <option key={option.id} value={option.id}>{option.property_name} · {monthByPeriod.get(option.id) || `${date(option.period_start)} – ${date(option.period_end)}`} · Remaining {formatMoney(option.available_amount)}</option>)}</select></label><label className="grid gap-1.5 text-sm font-medium">Amount paid<input required type="number" min="0.01" max={available || undefined} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="rounded-md border border-line px-3 py-2" /></label><label className="grid gap-1.5 text-sm font-medium">Payment date<input required type="date" max={new Date().toISOString().slice(0, 10)} value={paidAt} onChange={(event) => setPaidAt(event.target.value)} className="rounded-md border border-line px-3 py-2" /></label><label className="grid gap-1.5 text-sm font-medium">Transaction reference<input required value={reference} onChange={(event) => setReference(event.target.value)} className="rounded-md border border-line px-3 py-2" /></label><label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Proof of payment<input required type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} className="rounded-md border border-line px-3 py-2 text-sm" /></label><button disabled={submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:w-fit"><Upload size={16} />{submitting ? 'Submitting…' : 'Submit rent proof'}</button></form></section> : null}
      {submissions.length ? <section className="rounded-lg border border-line bg-white p-4"><h2 className="font-semibold text-ink">Rent proof review status</h2><ul className="mt-3 divide-y divide-line">{submissions.map((submission) => <li key={submission.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{formatMoney(submission.amount)} · Ref {submission.transaction_reference} · Paid {date(submission.paid_at)}</span><span className="capitalize">{submission.status}{submission.status === 'rejected' && submission.rejection_reason ? ` · ${submission.rejection_reason}` : ''}</span></li>)}</ul></section> : null}
      {receipt ? <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"><section role="dialog" aria-modal="true" aria-label="Rental receipt" className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"><div className="flex justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted">{receipt.snapshot?.company?.name || 'TerraOps'}</p>{receipt.snapshot?.company?.address ? <p className="mt-1 text-xs text-muted">{receipt.snapshot.company.address}</p> : null}<h2 className="mt-1 text-xl font-semibold text-ink">Rent payment receipt</h2></div><button type="button" onClick={() => setReceipt(null)} className="rounded border border-line px-3 py-1 text-sm">Close</button></div><p className="mt-4 text-sm text-muted">Receipt {receipt.receipt_number} · {date(receipt.issued_at)}</p><p className="mt-3 text-sm">{receipt.snapshot?.client?.full_name} · {receipt.snapshot?.rental?.property_name}</p><p className="mt-1 text-sm">{receipt.snapshot?.period?.start} – {receipt.snapshot?.period?.end}</p><p className="mt-3 font-semibold">Received {formatMoney(receipt.snapshot?.payment?.amount)}</p><p className="mt-1 text-sm text-muted">Reference: {receipt.snapshot?.payment?.reference || '—'}</p><button type="button" onClick={() => window.print()} className="mt-5 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white print:hidden">Print receipt</button></section></div> : null}
    </div>
  )
}
