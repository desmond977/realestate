import { ArrowLeft, CalendarDays, CreditCard, Loader2, Printer, ReceiptText, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { canRecordRentalPayments } from '../auth/permissions'
import { formatMoney } from '../utils/formatters'

function getApiError(error, fallback = 'Unable to load rental payment details.') {
  const errors = error.response?.data?.errors
  if (errors) return Object.values(errors).flat().join(' ')
  return error.response?.data?.message || fallback
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

function PaymentStatus({ status }) {
  const styles = {
    due: 'border-blue-200 bg-blue-50 text-blue-700',
    partial: 'border-amber-200 bg-amber-50 text-amber-700',
    overdue: 'border-red-200 bg-red-50 text-red-700',
    paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold capitalize ${styles[status] || styles.due}`}>{status}</span>
}

function RecordPaymentForm({ period, onSubmit, submitting, error }) {
  const [form, setForm] = useState({
    amount: String(period.balance),
    paid_at: new Date().toLocaleDateString('en-CA'),
    payment_method: 'bank_transfer',
    transaction_reference: '',
    notes: '',
  })

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function submit(event) {
    event.preventDefault()
    onSubmit({ ...form, amount: Number(form.amount) })
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-line bg-panel p-5 shadow-sm">
      <div>
        <h3 className="font-semibold text-ink">Record a payment</h3>
        <p className="mt-1 text-sm text-muted">Remaining balance: {formatMoney(period.balance)}</p>
      </div>
      {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-ink">Amount paid</span>
          <input required min="0.01" max={period.balance} step="0.01" type="number" value={form.amount} onChange={(event) => update('amount', event.target.value)} className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Payment date</span>
          <input required max={new Date().toLocaleDateString('en-CA')} type="date" value={form.paid_at} onChange={(event) => update('paid_at', event.target.value)} className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Payment method</span>
          <select required value={form.payment_method} onChange={(event) => update('payment_method', event.target.value)} className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm">
            <option value="bank_transfer">Bank transfer</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="cheque">Cheque</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Transaction reference (optional)</span>
          <input maxLength={255} value={form.transaction_reference} onChange={(event) => update('transaction_reference', event.target.value)} className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-medium text-ink">Notes (optional)</span>
        <textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" />
      </label>
      <button disabled={submitting} type="submit" className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
        Record payment
      </button>
    </form>
  )
}

export function RentalPaymentDetailsPage() {
  const { periodId } = useParams()
  const { user } = useAuth()
  const [result, setResult] = useState({ id: null, period: null, error: '' })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    api.get(`/rental-payment-periods/${periodId}`)
      .then((response) => {
        if (active) setResult({ id: periodId, period: response.data.data.period, error: '' })
      })
      .catch((error) => {
        if (active) setResult({ id: periodId, period: null, error: getApiError(error) })
      })
    return () => { active = false }
  }, [periodId])

  async function reloadPeriod() {
    const response = await api.get(`/rental-payment-periods/${periodId}`)
    setResult({ id: periodId, period: response.data.data.period, error: '' })
  }

  async function recordPayment(payload) {
    setSubmitting(true)
    setFormError('')
    try {
      await api.post(`/rental-payment-periods/${periodId}/payments`, payload)
      await reloadPeriod()
    } catch (error) {
      setFormError(getApiError(error, 'Unable to record rental payment.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (result.id !== periodId) {
    return <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted"><Loader2 size={18} className="animate-spin" />Loading rental payment</div>
  }

  if (result.error || !result.period) {
    return (
      <section className="space-y-4">
        <Link to="/rental-payments" className="inline-flex items-center gap-2 text-sm font-medium text-brand"><ArrowLeft size={16} />Back to rental payments</Link>
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{result.error || 'Rental payment period not found.'}</p>
      </section>
    )
  }

  const period = result.period
  const agreement = period.rental_agreement
  const receipt = period.payments?.find((payment) => payment.receipt)?.receipt

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <Link to={`/rental-payments?rental_id=${agreement?.id || ''}`} className="inline-flex items-center gap-2 text-sm font-medium text-brand"><ArrowLeft size={16} />Back to rental payments</Link>

      <header className="rounded-lg border border-line bg-panel p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-brand">Rental payment period #{period.id}</p>
            <h2 className="mt-1 text-2xl font-semibold text-ink">{agreement?.rental_property?.name || 'Rental property'}</h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted"><UserRound size={15} />{agreement?.client?.full_name || 'Tenant'} · {agreement?.rental_frequency}</p>
          </div>
          <PaymentStatus status={period.status} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md bg-canvas p-3"><p className="text-xs text-muted">Period</p><p className="mt-1 text-sm font-medium text-ink">{formatDate(period.period_start)} – {formatDate(period.period_end)}</p></div>
          <div className="rounded-md bg-canvas p-3"><p className="text-xs text-muted">Due date</p><p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-ink"><CalendarDays size={14} />{formatDate(period.due_date)}</p></div>
          <div className="rounded-md bg-canvas p-3"><p className="text-xs text-muted">Amount due</p><p className="mt-1 text-sm font-semibold text-ink">{formatMoney(period.amount_due)}</p></div>
          <div className="rounded-md bg-canvas p-3"><p className="text-xs text-muted">Paid / balance</p><p className="mt-1 text-sm font-semibold text-ink">{formatMoney(period.amount_paid)} / {formatMoney(period.balance)}</p></div>
        </div>
      </header>

      {canRecordRentalPayments(user) && period.balance > 0 && agreement?.status === 'active' ? (
        <RecordPaymentForm period={period} onSubmit={recordPayment} submitting={submitting} error={formError} />
      ) : null}

      <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-sm">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3"><CreditCard size={17} className="text-brand" /><h3 className="font-semibold text-ink">Payment history</h3></div>
        {period.payments?.length ? (
          <div className="divide-y divide-line">
            {period.payments.map((payment) => (
              <article key={payment.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-ink">{formatMoney(payment.amount)} <span className="ml-1 text-xs font-medium capitalize text-emerald-700">{payment.status}</span></p>
                  <p className="mt-1 text-sm text-muted">{formatDate(payment.paid_at)} · {payment.payment_method?.replaceAll('_', ' ')}</p>
                  {payment.transaction_reference ? <p className="mt-1 text-xs text-muted">Reference: {payment.transaction_reference}</p> : null}
                  {payment.recorder?.name ? <p className="mt-1 text-xs text-muted">Recorded by {payment.recorder.name}</p> : null}
                  {payment.notes ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{payment.notes}</p> : null}
                </div>
                {payment.receipt ? (
                  <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    <ReceiptText size={15} />
                    <span>{payment.receipt.receipt_number}</span>
                    <button type="button" onClick={() => window.print()} className="ml-1 inline-flex items-center gap-1 font-semibold hover:underline print:hidden"><Printer size={14} />Print</button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : <p className="p-5 text-sm text-muted">No payments recorded for this period.</p>}
      </section>

      {receipt ? (
        <section className="rounded-lg border border-line bg-panel p-5 shadow-sm print:border-0 print:shadow-none">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Rental receipt</p>
          <h3 className="mt-1 text-xl font-semibold text-ink">{receipt.snapshot?.company?.name || 'Company'}</h3>
          <p className="mt-2 text-sm text-muted">{receipt.receipt_number} · {formatDate(receipt.issued_at)}</p>
          <p className="mt-4 text-sm text-ink">Received {formatMoney(receipt.snapshot?.payment?.amount)} from {receipt.snapshot?.client?.full_name} for {receipt.snapshot?.rental?.property_name}.</p>
        </section>
      ) : null}
    </section>
  )
}
