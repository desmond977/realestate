import { ArrowLeft, CreditCard, Edit3, Loader2, Printer, ReceiptText, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import {
  canManageServiceCharges,
  canRecordServiceChargePayments,
} from '../auth/permissions'
import { formatMoney } from '../utils/formatters'

function getApiError(error, fallback = 'Unable to load service charge.') {
  const errors = error.response?.data?.errors
  if (errors) return Object.values(errors).flat().join(' ')
  return error.response?.data?.message || fallback
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—'
}

function StatusBadge({ status }) {
  const styles = {
    due: 'border-blue-200 bg-blue-50 text-blue-700',
    partial: 'border-amber-200 bg-amber-50 text-amber-700',
    overdue: 'border-red-200 bg-red-50 text-red-700',
    paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold capitalize ${styles[status] || styles.due}`}>{status}</span>
}

function RecordPaymentForm({ charge, onSubmit, submitting, error }) {
  const [form, setForm] = useState({
    amount: String(charge.balance),
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
      <div><h3 className="font-semibold text-ink">Record a service charge payment</h3><p className="mt-1 text-sm text-muted">Outstanding balance: {formatMoney(charge.balance)}</p></div>
      {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="text-sm font-medium text-ink">Amount paid</span><input required min="0.01" max={charge.balance} step="0.01" type="number" value={form.amount} onChange={(event) => update('amount', event.target.value)} className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" /></label>
        <label className="block"><span className="text-sm font-medium text-ink">Payment date</span><input required type="date" max={new Date().toLocaleDateString('en-CA')} value={form.paid_at} onChange={(event) => update('paid_at', event.target.value)} className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" /></label>
        <label className="block">
          <span className="text-sm font-medium text-ink">Payment method</span>
          <select required value={form.payment_method} onChange={(event) => update('payment_method', event.target.value)} className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm">
            <option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="card">Card</option><option value="cheque">Cheque</option><option value="other">Other</option>
          </select>
        </label>
        <label className="block"><span className="text-sm font-medium text-ink">Transaction reference (optional)</span><input maxLength={255} value={form.transaction_reference} onChange={(event) => update('transaction_reference', event.target.value)} className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" /></label>
      </div>
      <label className="block"><span className="text-sm font-medium text-ink">Notes (optional)</span><textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm" /></label>
      <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{submitting ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}Record payment</button>
    </form>
  )
}

function Detail({ label, value }) {
  return <div className="rounded-md bg-canvas p-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-sm font-medium text-ink">{value || '—'}</p></div>
}

export function ServiceChargeDetailsPage() {
  const { serviceChargeId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [result, setResult] = useState({ id: null, charge: null, error: '' })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    api.get(`/service-charges/${serviceChargeId}`)
      .then((response) => {
        if (active) setResult({ id: serviceChargeId, charge: response.data.data.service_charge, error: '' })
      })
      .catch((error) => {
        if (active) setResult({ id: serviceChargeId, charge: null, error: getApiError(error) })
      })
    return () => { active = false }
  }, [serviceChargeId])

  async function reloadCharge() {
    const response = await api.get(`/service-charges/${serviceChargeId}`)
    setResult({ id: serviceChargeId, charge: response.data.data.service_charge, error: '' })
  }

  async function recordPayment(payload) {
    setSubmitting(true)
    setFormError('')
    try {
      await api.post(`/service-charges/${serviceChargeId}/payments`, payload)
      await reloadCharge()
    } catch (error) {
      setFormError(getApiError(error, 'Unable to record service charge payment.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (result.id !== serviceChargeId) {
    return <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted"><Loader2 size={18} className="animate-spin" />Loading service charge</div>
  }

  if (result.error || !result.charge) {
    return <section className="space-y-4"><Link to="/service-charges" className="inline-flex items-center gap-2 text-sm font-medium text-brand"><ArrowLeft size={16} />Back to service charges</Link><p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{result.error || 'Service charge not found.'}</p></section>
  }

  const charge = result.charge
  const receipt = charge.payments?.find((payment) => payment.receipt)?.receipt

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/service-charges" className="inline-flex items-center gap-2 text-sm font-medium text-brand"><ArrowLeft size={16} />Back to service charges</Link>
        {canManageServiceCharges(user) ? <button type="button" disabled={charge.amount_paid > 0} onClick={() => navigate(`/service-charges?edit=${charge.id}`)} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50"><Edit3 size={16} />Edit charge</button> : null}
      </div>

      <header className="rounded-lg border border-line bg-panel p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-sm font-medium text-brand">{charge.category?.name} · Service charge #{charge.id}</p><h2 className="mt-1 text-2xl font-semibold text-ink">{charge.rental_property?.name || 'Rental property'}</h2><p className="mt-1 flex items-center gap-2 text-sm text-muted"><UserRound size={15} />{charge.client?.full_name || 'Tenant'} · {charge.description || charge.category?.name}</p></div>
          <StatusBadge status={charge.status} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Billing period" value={`${formatDate(charge.billing_period_start)} – ${formatDate(charge.billing_period_end)}`} />
          <Detail label="Billing date" value={formatDate(charge.billing_date)} />
          <Detail label="Due date" value={formatDate(charge.due_date)} />
          <Detail label="Tenancy" value={`Agreement #${charge.rental_agreement?.id}`} />
          <Detail label="Amount due" value={formatMoney(charge.amount_due)} />
          <Detail label="Amount paid" value={formatMoney(charge.amount_paid)} />
          <Detail label="Outstanding balance" value={formatMoney(charge.balance)} />
          <Detail label="Property location" value={charge.rental_property?.location} />
        </div>
        {charge.notes ? <p className="mt-4 whitespace-pre-wrap text-sm text-muted">{charge.notes}</p> : null}
      </header>

      {canRecordServiceChargePayments(user) && charge.balance > 0 && charge.rental_agreement?.status === 'active' ? <RecordPaymentForm key={charge.id} charge={charge} onSubmit={recordPayment} submitting={submitting} error={formError} /> : null}

      <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-sm">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3"><CreditCard size={17} className="text-brand" /><h3 className="font-semibold text-ink">Payment history</h3></div>
        {charge.payments?.length ? <div className="divide-y divide-line">{charge.payments.map((payment) => (
          <article key={payment.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="font-semibold text-ink">{formatMoney(payment.amount)} <span className="ml-1 text-xs font-medium capitalize text-emerald-700">{payment.status}</span></p><p className="mt-1 text-sm capitalize text-muted">{formatDate(payment.paid_at)} · {payment.payment_method?.replaceAll('_', ' ')}</p>{payment.transaction_reference ? <p className="mt-1 text-xs text-muted">Reference: {payment.transaction_reference}</p> : null}{payment.recorder?.name ? <p className="mt-1 text-xs text-muted">Recorded by {payment.recorder.name}</p> : null}{payment.notes ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{payment.notes}</p> : null}</div>
            {payment.receipt ? <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><ReceiptText size={15} /><span>{payment.receipt.receipt_number}</span><button type="button" onClick={() => window.print()} className="ml-1 inline-flex items-center gap-1 font-semibold hover:underline print:hidden"><Printer size={14} />Print</button></div> : null}
          </article>
        ))}</div> : <p className="p-5 text-sm text-muted">No payments recorded for this charge.</p>}
      </section>

      {receipt ? <section className="rounded-lg border border-line bg-panel p-5 shadow-sm print:border-0 print:shadow-none"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Service charge receipt</p><h3 className="mt-1 text-xl font-semibold text-ink">{receipt.snapshot?.company?.name || 'Company'}</h3><p className="mt-2 text-sm text-muted">{receipt.receipt_number} · {formatDate(receipt.issued_at)}</p><p className="mt-4 text-sm text-ink">Received {formatMoney(receipt.snapshot?.payment?.amount)} from {receipt.snapshot?.client?.full_name} for {receipt.snapshot?.service_charge?.category} at {receipt.snapshot?.property?.name}.</p></section> : null}
    </section>
  )
}
