import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, Loader2, Upload, XCircle } from 'lucide-react'
import { formatMoney } from '../../utils/formatters'
import { paymentProofSubmissionsApi, serviceChargesApi } from '../../services/clientApi'

function Status({ value }) {
  const style = {
    paid: 'bg-emerald-50 text-emerald-800',
    partial: 'bg-amber-50 text-amber-800',
    non_payment: 'bg-red-50 text-red-800',
    unpaid_pending: 'bg-blue-50 text-blue-800',
  }[value] || 'bg-canvas text-muted'
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${style}`}>{value?.replaceAll('_', ' ')}</span>
}

function formatDate(value) {
  return value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString() : '—'
}

function formatBillingMonth(value) {
  return value
    ? new Date(`${value}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : '—'
}

export function ClientServiceChargesPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [charges, setCharges] = useState([])
  const [options, setOptions] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [summary, setSummary] = useState({ collections: 0, outstanding: 0 })
  const [selectedId, setSelectedId] = useState('')
  const [amount, setAmount] = useState('')
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [receipt, setReceipt] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [chargesResponse, optionsResponse, submissionsResponse] = await Promise.all([
        serviceChargesApi.list(month),
        paymentProofSubmissionsApi.options(),
        paymentProofSubmissionsApi.list(1),
      ])
      setCharges(chargesResponse.data.data.charges || [])
      setSummary({
        collections: chargesResponse.data.data.collections || 0,
        outstanding: chargesResponse.data.data.outstanding || 0,
      })
      setOptions(optionsResponse.data.data.service_charges || [])
      setSubmissions((submissionsResponse.data.data || []).filter((submission) => submission.payment_category === 'service_charge'))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load your service charges.')
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const availableById = useMemo(() => new Map(options.map((charge) => [String(charge.id), charge.available_amount])), [options])
  const selected = options.find((charge) => String(charge.id) === selectedId)
  const eligible = options.filter((charge) => Number(charge.available_amount) > 0)
  const monthSubmissions = submissions.filter((submission) => submission.service_charge?.billing_month === month)

  function chooseCharge(id) {
    setSelectedId(id)
    const available = availableById.get(String(id))
    setAmount(available ? String(available) : '')
  }

  async function submit(event) {
    event.preventDefault()
    if (!selected || !file) return
    setSubmitting(true)
    setError('')
    setSuccess('')
    const payload = new FormData()
    payload.append('payment_category', 'service_charge')
    payload.append('service_charge_id', selected.id)
    payload.append('amount', amount)
    payload.append('paid_at', paidAt)
    payload.append('transaction_reference', reference.trim())
    payload.append('proof_of_payment', file)
    try {
      const response = await paymentProofSubmissionsApi.submit(payload)
      setSuccess(response.data.message || 'Proof submitted for review.')
      setSelectedId('')
      setAmount('')
      setReference('')
      setFile(null)
      await load()
    } catch (requestError) {
      const validationErrors = requestError.response?.data?.errors
      setError(validationErrors ? Object.values(validationErrors).flat().join(' ') : requestError.response?.data?.message || 'Payment proof could not be submitted.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-medium text-brand">Client payments</p><h1 className="mt-1 text-2xl font-semibold text-ink">Service Charge Payments</h1><p className="mt-1 text-sm text-muted">Service charges and receipts are kept separate from rent payments.</p></div>
        <label className="grid gap-1 text-sm font-medium text-ink">Billing month<input aria-label="Billing month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-md border border-line bg-white px-3 py-2" /></label>
      </header>
      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      {success ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-line bg-white p-4"><p className="text-xs font-medium uppercase text-muted">Confirmed collections</p><p className="mt-2 text-2xl font-semibold">{formatMoney(summary.collections)}</p></div><div className="rounded-lg border border-line bg-white p-4"><p className="text-xs font-medium uppercase text-muted">Outstanding</p><p className="mt-2 text-2xl font-semibold">{formatMoney(summary.outstanding)}</p></div></div>
      <section className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-3"><h2 className="font-semibold text-ink">Charges for {formatBillingMonth(month)}</h2></div>
        {loading ? <div className="p-8 text-sm text-muted"><Loader2 className="mr-2 inline animate-spin" size={16} />Loading charges</div> : charges.length === 0 ? <p className="p-8 text-sm text-muted">No service charge records for this month.</p> : <div className="overflow-x-auto"><table className="min-w-full divide-y divide-line text-sm"><thead className="bg-canvas text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Charge</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Paid</th><th className="px-4 py-3">Balance</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payment history / receipts</th><th className="px-4 py-3"></th></tr></thead><tbody className="divide-y divide-line">{charges.map((charge) => <tr key={charge.id} className="align-top"><td className="px-4 py-3"><p className="font-semibold text-ink">{charge.category?.name || 'Service charge'}</p><p className="text-xs text-muted">{charge.rental_property?.name || 'Property'} · {formatBillingMonth(charge.billing_month)}</p></td><td className="px-4 py-3">{formatMoney(charge.amount_due)}</td><td className="px-4 py-3">{formatMoney(charge.amount_paid)}</td><td className="px-4 py-3">{formatMoney(charge.balance)}</td><td className="px-4 py-3"><Status value={charge.status} /></td><td className="px-4 py-3">{charge.payments?.length ? <ul className="space-y-2">{charge.payments.map((payment) => <li key={payment.id}><p>{formatMoney(payment.amount)} · {payment.paid_date} {payment.paid_time} ({payment.paid_weekday})</p>{payment.receipt ? <button type="button" onClick={() => setReceipt(payment.receipt)} className="text-xs font-medium text-brand hover:underline">View receipt {payment.receipt.receipt_number}</button> : null}</li>)}</ul> : <span className="text-muted">No confirmed payments</span>}</td><td className="px-4 py-3">{Number(availableById.get(String(charge.id)) || 0) > 0 ? <button type="button" onClick={() => chooseCharge(String(charge.id))} className="whitespace-nowrap rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white">Submit proof</button> : null}</td></tr>)}</tbody></table></div>}
      </section>
      {selected ? (
        <section className="rounded-lg border border-line bg-white p-4 shadow-sm sm:p-5">
          <h2 className="font-semibold text-ink">Submit service charge proof</h2>
          <p className="mt-1 text-sm text-muted">Choose any outstanding service charge. Your balance changes only after approval.</p>
          <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Service charge
              <select required value={selectedId} onChange={(event) => chooseCharge(event.target.value)} className="rounded-md border border-line px-3 py-2">
                <option value="">Select a service charge</option>
                {eligible.map((charge) => (
                  <option key={charge.id} value={charge.id}>
                    {charge.category || 'Service charge'} · {charge.property_name || 'Property'} · {formatBillingMonth(charge.billing_month)} · Remaining {formatMoney(charge.available_amount)}
                  </option>
                ))}
              </select>
            </label>
            {selected ? (
              <div className="flex min-w-0 flex-col justify-between gap-2 rounded-md border border-line bg-canvas px-3 py-2.5 sm:col-span-2 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{selected.category || 'Service Charge'}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">{selected.property_name || 'Property'} · {formatBillingMonth(selected.billing_month)}</p>
                </div>
                <div className="shrink-0 sm:text-right">
                  <p className="text-xs text-muted">Remaining</p>
                  <p className="text-sm font-semibold tabular-nums text-ink">{formatMoney(selected.available_amount)}</p>
                </div>
              </div>
            ) : null}
            <label className="grid gap-1.5 text-sm font-medium">Amount paid<input required type="number" min="0.01" max={availableById.get(selectedId)} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="rounded-md border border-line px-3 py-2" /></label>
            <label className="grid gap-1.5 text-sm font-medium">Payment date<input required type="date" max={new Date().toISOString().slice(0, 10)} value={paidAt} onChange={(event) => setPaidAt(event.target.value)} className="rounded-md border border-line px-3 py-2" /></label>
            <label className="grid gap-1.5 text-sm font-medium">Transaction reference<input required maxLength={255} value={reference} onChange={(event) => setReference(event.target.value)} className="rounded-md border border-line px-3 py-2" /></label>
            <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Proof of payment<input required type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} className="rounded-md border border-line px-3 py-2 text-sm" /><span className="text-xs font-normal text-muted">JPG, PNG, WEBP, or PDF. Maximum 5 MB.</span></label>
            <button disabled={submitting || !selectedId || !file} className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Upload size={15} />{submitting ? 'Submitting…' : 'Submit proof for review'}</button>
          </form>
        </section>
      ) : null}
      <section className="overflow-hidden rounded-lg border border-line bg-white"><div className="border-b border-line px-4 py-3"><h2 className="font-semibold text-ink">Proof submission history · {month}</h2><p className="mt-1 text-sm text-muted">Pending submissions do not reduce the confirmed balance.</p></div>{monthSubmissions.length ? <ul className="divide-y divide-line">{monthSubmissions.map((submission) => <li key={submission.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"><div><p className="font-medium text-ink">{submission.service_charge?.category} · {formatMoney(submission.amount)} · Ref {submission.transaction_reference}</p>{submission.status === 'rejected' && submission.rejection_reason ? <p className="mt-1 text-sm text-red-700">Reason: {submission.rejection_reason}</p> : null}</div><span className="inline-flex items-center gap-1 text-sm capitalize text-muted">{submission.status === 'approved' ? <CheckCircle2 size={15} /> : submission.status === 'rejected' ? <XCircle size={15} /> : <Clock3 size={15} />}{submission.status}</span></li>)}</ul> : <p className="p-5 text-sm text-muted">No submissions for this month.</p>}</section>
      {receipt ? <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"><section role="dialog" aria-modal="true" aria-label="Service charge receipt" className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"><div className="flex justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted">{receipt.snapshot?.company?.name || 'TerraOps'}</p>{receipt.snapshot?.company?.address ? <p className="mt-1 text-xs text-muted">{receipt.snapshot.company.address}</p> : null}<h2 className="mt-1 text-xl font-semibold text-ink">Service charge receipt</h2></div><button type="button" onClick={() => setReceipt(null)} className="rounded border border-line px-3 py-1 text-sm">Close</button></div><p className="mt-4 text-sm text-muted">Receipt {receipt.receipt_number} · {formatDate(receipt.issued_at)}</p><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted">Tenant</dt><dd className="font-medium">{receipt.snapshot?.client?.full_name}</dd></div><div><dt className="text-muted">Property</dt><dd className="font-medium">{receipt.snapshot?.property?.name}</dd></div><div><dt className="text-muted">Charge</dt><dd className="font-medium">{receipt.snapshot?.service_charge?.category} · {formatBillingMonth(receipt.snapshot?.service_charge?.billing_month)}</dd></div><div><dt className="text-muted">Amount paid</dt><dd className="font-medium">{formatMoney(receipt.snapshot?.payment?.amount)}</dd></div><div><dt className="text-muted">Remaining balance</dt><dd className="font-medium">{formatMoney(receipt.snapshot?.service_charge?.balance)}</dd></div><div><dt className="text-muted">Transaction reference</dt><dd className="break-all font-medium">{receipt.snapshot?.payment?.reference || '—'}</dd></div><div><dt className="text-muted">Payment date and time</dt><dd className="font-medium">{receipt.snapshot?.payment?.paid_date} {receipt.snapshot?.payment?.paid_time} ({receipt.snapshot?.payment?.paid_weekday})</dd></div></dl><button type="button" onClick={() => window.print()} className="mt-5 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white print:hidden">Print receipt</button></section></div> : null}
    </div>
  )
}
