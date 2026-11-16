import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Building2, CircleDollarSign, Loader2, TrendingUp, Upload, Wallet } from 'lucide-react'
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
  const [paystackEnabled, setPaystackEnabled] = useState(false)
  const [paystackPeriodId, setPaystackPeriodId] = useState('')
  const [paystackAmount, setPaystackAmount] = useState('')
  const [paystackSubmitting, setPaystackSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([rentalPaymentsApi.list(), paymentProofSubmissionsApi.options(), paymentProofSubmissionsApi.list(1), rentalPaymentsApi.paystackAvailability()])
      .then(([periodResponse, optionsResponse, submissionsResponse, paystackResponse]) => {
        if (!active) return
        setPeriods(periodResponse.data.data.periods || [])
        setSummary({ total_due: periodResponse.data.data.total_due || 0, total_paid: periodResponse.data.data.total_paid || 0, outstanding: periodResponse.data.data.outstanding || 0 })
        setOptions(optionsResponse.data.data.rental_payment_periods || [])
        setSubmissions((submissionsResponse.data.data || []).filter((item) => item.payment_category === 'rental'))
        setPaystackEnabled(Boolean(paystackResponse.data.data?.enabled))
      })
      .catch((requestError) => active && setError(requestError.response?.data?.message || 'Unable to load your rent payments.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  useEffect(() => {
    const reference = new URLSearchParams(location.search).get('paystack_reference')
    if (!reference) return
    let active = true
    rentalPaymentsApi.paystackStatus(reference)
      .then(async (response) => {
        if (!active) return
        const status = response.data.data?.status
        setSuccess(status === 'paid'
          ? `Paystack payment confirmed. Receipt ${response.data.data?.receipt?.receipt_number || 'issued'}.`
          : status === 'failed'
            ? 'Paystack payment was not completed. Your rent balance is unchanged.'
            : status === 'review'
              ? 'Paystack received the payment, but it needs admin review before your rent balance changes.'
              : 'Paystack payment is still processing. Your rent balance will update after confirmation.')
        if (status === 'paid') {
          const refreshed = await rentalPaymentsApi.list()
          setPeriods(refreshed.data.data.periods || [])
          setSummary({ total_due: refreshed.data.data.total_due || 0, total_paid: refreshed.data.data.total_paid || 0, outstanding: refreshed.data.data.outstanding || 0 })
        }
      })
      .catch(() => active && setError('Unable to check the Paystack payment status. Your rent balance will update after Paystack confirms it.'))
      .finally(() => {
        if (active) window.history.replaceState({}, '', location.pathname)
      })
    return () => { active = false }
  }, [location.pathname, location.search])

  useEffect(() => {
    if (location.hash === '#rental-receipts' && !loading) {
      document.getElementById('rental-receipts')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [loading, location.hash])

  const available = useMemo(() => options.find((item) => String(item.id) === periodId)?.available_amount || 0, [options, periodId])
  const paystackAvailable = useMemo(() => options.find((item) => String(item.id) === paystackPeriodId)?.available_amount || 0, [options, paystackPeriodId])
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

  async function payWithPaystack(event) {
    event.preventDefault()
    setPaystackSubmitting(true)
    setError('')
    try {
      const response = await rentalPaymentsApi.startPaystackCheckout({ category: 'rental', target_id: paystackPeriodId, amount: paystackAmount })
      window.location.assign(response.data.data.checkout_url)
    } catch (requestError) {
      const validationErrors = requestError.response?.data?.errors
      setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : requestError.response?.data?.message || 'Unable to start Paystack checkout.')
      setPaystackSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <header><p className="text-sm font-medium text-brand">Client payments</p><h1 className="mt-1 text-2xl font-semibold text-ink">Rent Payments</h1><p className="mt-1 text-sm text-muted">Rent charges, confirmed payments, and rental receipts. Service charges are listed separately.</p></header>
      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      {success ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p> : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[{ label: 'Rent due', value: summary.total_due, Icon: CircleDollarSign }, { label: 'Rent paid', value: summary.total_paid, Icon: TrendingUp }, { label: 'Outstanding', value: summary.outstanding, Icon: Wallet, featured: true }].map(({ label, value, Icon, featured }) => <article key={label} className={`min-w-0 rounded-2xl border p-4 shadow-sm sm:p-5 ${featured ? 'col-span-2 border-brand bg-brand text-white sm:col-span-1' : 'border-line bg-white text-ink'}`}><div className="flex items-center justify-between gap-2"><p className={`text-[11px] font-semibold uppercase tracking-wider sm:text-xs ${featured ? 'text-white/75' : 'text-muted'}`}>{label}</p><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${featured ? 'bg-white/15 text-white' : 'bg-brand/10 text-brand'}`}><Icon size={17} /></span></div><p className={`mt-3 truncate text-lg font-bold tabular-nums sm:text-2xl ${featured ? 'text-white' : 'text-ink'}`}>{formatMoney(value)}</p>{featured ? <p className="mt-1 text-xs text-white/75">Balance remaining</p> : null}</article>)}</div>
      {paystackEnabled && options.length ? <section className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-brand">Secure online payment</p><h2 className="mt-1 font-semibold text-ink">Pay rent with Paystack</h2><p className="mt-1 text-sm text-muted">Pay the full remaining amount or enter a smaller partial payment. Your balance changes after Paystack confirms the transaction.</p></div><form onSubmit={payWithPaystack} className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-end"><label className="grid gap-1.5 text-sm font-medium">Rental period<select required value={paystackPeriodId} onChange={(event) => { const id = event.target.value; const value = options.find((option) => String(option.id) === id)?.available_amount || ''; setPaystackPeriodId(id); setPaystackAmount(String(value)) }} className="rounded-md border border-line px-3 py-2"><option value="">Select period</option>{options.map((option) => <option key={option.id} value={option.id}>{option.property_name} · {date(option.period_start)} – {date(option.period_end)} · {formatMoney(option.available_amount)} due</option>)}</select></label><label className="grid gap-1.5 text-sm font-medium">Amount (NGN)<input required type="number" min="1" max={paystackAvailable || undefined} step="0.01" value={paystackAmount} onChange={(event) => setPaystackAmount(event.target.value)} className="rounded-md border border-line px-3 py-2" /></label><button disabled={paystackSubmitting || !paystackPeriodId} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{paystackSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}{paystackSubmitting ? 'Preparing…' : 'Pay with Paystack'}</button></form></section> : null}
      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div id="rental-receipts" className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-5">
          <div><p className="text-xs font-medium uppercase tracking-wide text-brand">Payment activity</p><h2 className="mt-0.5 font-semibold text-ink">Rent payment history</h2></div>
          {periods.length ? <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-muted">{periods.length} {periods.length === 1 ? 'period' : 'periods'}</span> : null}
        </div>
        {loading ? <div className="p-6 text-sm text-muted"><Loader2 size={16} className="mr-2 inline animate-spin" />Loading rent periods</div> : periods.length ? <>
          <div className="divide-y divide-line md:hidden">
            {periods.map((period) => (
              <article key={period.id} className="p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><Building2 size={18} /></span>
                    <div className="min-w-0"><h3 className="truncate text-sm font-semibold text-ink">{period.rental_agreement?.rental_property?.name || 'Rental property'}</h3><p className="mt-1 text-xs text-muted">{date(period.period_start)} – {date(period.period_end)}</p></div>
                  </div>
                  <span className="shrink-0 rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold capitalize text-muted">{period.status}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="min-w-0 rounded-xl bg-canvas p-2.5"><p className="text-[10px] font-medium uppercase tracking-wide text-muted">Due</p><p className="mt-1 truncate text-xs font-semibold tabular-nums text-ink">{formatMoney(period.amount_due)}</p></div>
                  <div className="min-w-0 rounded-xl bg-canvas p-2.5"><p className="text-[10px] font-medium uppercase tracking-wide text-muted">Paid</p><p className="mt-1 truncate text-xs font-semibold tabular-nums text-ink">{formatMoney(period.amount_paid)}</p></div>
                  <div className="min-w-0 rounded-xl bg-brand/5 p-2.5"><p className="text-[10px] font-medium uppercase tracking-wide text-brand">Balance</p><p className="mt-1 truncate text-xs font-semibold tabular-nums text-brand">{formatMoney(period.balance)}</p></div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-3 text-xs"><span className="font-medium text-muted">Receipts</span>{period.payments?.length ? period.payments.map((payment) => <span key={payment.id} className="text-muted">{payment.receipt ? <button type="button" onClick={() => setReceipt(payment.receipt)} className="font-semibold text-brand hover:underline">View {payment.receipt.receipt_number}</button> : <span className="font-medium text-ink">Confirmed payment</span>} · {date(payment.paid_at)}</span>) : <span className="text-muted">No receipts yet</span>}</div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block"><table className="min-w-full text-left text-sm"><thead className="bg-canvas text-xs uppercase text-muted"><tr><th className="px-4 py-3">Property / period</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Paid</th><th className="px-4 py-3">Balance</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Receipts</th></tr></thead><tbody className="divide-y divide-line">{periods.map((period) => <tr key={period.id} className="align-top"><td className="px-4 py-3"><p className="font-medium text-ink">{period.rental_agreement?.rental_property?.name}</p><p className="text-xs text-muted">{date(period.period_start)} – {date(period.period_end)}</p></td><td className="px-4 py-3">{formatMoney(period.amount_due)}</td><td className="px-4 py-3">{formatMoney(period.amount_paid)}</td><td className="px-4 py-3">{formatMoney(period.balance)}</td><td className="px-4 py-3 capitalize">{period.status}</td><td className="px-4 py-3">{period.payments?.length ? period.payments.map((payment) => <div key={payment.id} className="mb-1">{payment.receipt ? <button type="button" onClick={() => setReceipt(payment.receipt)} className="font-medium text-brand hover:underline">View {payment.receipt.receipt_number}</button> : <span>Confirmed payment</span>} · {date(payment.paid_at)}</div>) : <span className="text-muted">—</span>}</td></tr>)}</tbody></table></div>
        </> : <p className="p-6 text-sm text-muted">No rental payment periods found.</p>}
      </section>
      {options.length ? <section className="rounded-lg border border-line bg-white p-4 sm:p-5"><h2 className="font-semibold text-ink">Submit rent payment proof</h2><p className="mt-1 text-sm text-muted">Pending submissions do not reduce confirmed rent balances.</p><form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium">Rental period<select required value={periodId} onChange={(event) => { const id = event.target.value; setPeriodId(id); setAmount(String(options.find((option) => String(option.id) === id)?.available_amount || '')) }} className="rounded-md border border-line px-3 py-2"><option value="">Select period</option>{options.map((option) => <option key={option.id} value={option.id}>{option.property_name} · {monthByPeriod.get(option.id) || `${date(option.period_start)} – ${date(option.period_end)}`} · Remaining {formatMoney(option.available_amount)}</option>)}</select></label><label className="grid gap-1.5 text-sm font-medium">Amount paid<input required type="number" min="0.01" max={available || undefined} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="rounded-md border border-line px-3 py-2" /></label><label className="grid gap-1.5 text-sm font-medium">Payment date<input required type="date" max={new Date().toISOString().slice(0, 10)} value={paidAt} onChange={(event) => setPaidAt(event.target.value)} className="rounded-md border border-line px-3 py-2" /></label><label className="grid gap-1.5 text-sm font-medium">Transaction reference<input required value={reference} onChange={(event) => setReference(event.target.value)} className="rounded-md border border-line px-3 py-2" /></label><label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Proof of payment<input required type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} className="rounded-md border border-line px-3 py-2 text-sm" /></label><button disabled={submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:w-fit"><Upload size={16} />{submitting ? 'Submitting…' : 'Submit rent proof'}</button></form></section> : null}
      {submissions.length ? <section className="rounded-lg border border-line bg-white p-4"><h2 className="font-semibold text-ink">Rent proof review status</h2><ul className="mt-3 divide-y divide-line">{submissions.map((submission) => <li key={submission.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{formatMoney(submission.amount)} · Ref {submission.transaction_reference} · Paid {date(submission.paid_at)}</span><span className="capitalize">{submission.status}{submission.status === 'rejected' && submission.rejection_reason ? ` · ${submission.rejection_reason}` : ''}</span></li>)}</ul></section> : null}
      {receipt ? <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"><section role="dialog" aria-modal="true" aria-label="Rental receipt" className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"><div className="flex justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted">{receipt.snapshot?.company?.name || 'TerraOps'}</p>{receipt.snapshot?.company?.address ? <p className="mt-1 text-xs text-muted">{receipt.snapshot.company.address}</p> : null}<h2 className="mt-1 text-xl font-semibold text-ink">Rent payment receipt</h2></div><button type="button" onClick={() => setReceipt(null)} className="rounded border border-line px-3 py-1 text-sm">Close</button></div><p className="mt-4 text-sm text-muted">Receipt {receipt.receipt_number} · {date(receipt.issued_at)}</p><p className="mt-3 text-sm">{receipt.snapshot?.client?.full_name} · {receipt.snapshot?.rental?.property_name}</p><p className="mt-1 text-sm">{receipt.snapshot?.period?.start} – {receipt.snapshot?.period?.end}</p><p className="mt-3 font-semibold">Received {formatMoney(receipt.snapshot?.payment?.amount)}</p><p className="mt-1 text-sm text-muted">Reference: {receipt.snapshot?.payment?.reference || '—'}</p><button type="button" onClick={() => window.print()} className="mt-5 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white print:hidden">Print receipt</button></section></div> : null}
    </div>
  )
}
