import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Landmark,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useClientBranding } from '../../components/client/ClientBrandLogo'
import { dashboardApi } from '../../services/clientApi'
import { formatMoney } from '../../utils/formatters'

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-muted">{label}</p>
          <p className="mt-2 break-words text-xl font-semibold text-ink sm:text-2xl">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand/10 text-brand">
          <Icon size={19} />
        </span>
      </div>
    </div>
  )
}

function ActivityRow({ title, subtitle, amount }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-line bg-white px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 text-xs text-muted">{subtitle}</p>
      </div>
      <p className="shrink-0 text-sm font-semibold text-ink">{formatMoney(amount)}</p>
    </div>
  )
}

export function ClientDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const branding = useClientBranding()

  useEffect(() => {
    let active = true

    dashboardApi
      .getDashboard()
      .then((response) => active && setData(response.data))
      .catch(() => active && setError('Unable to load your dashboard.'))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="h-44 animate-pulse rounded-lg border border-line bg-white" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-lg border border-line bg-white" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
  }

  const summary = data?.summary || {}
  const progress = Math.min(Number(summary.payment_progress || 0), 100)
  const recentPayments = data?.recent_payments || []
  const recentReceipts = data?.recent_receipts || []
  const firstRealtor = data?.realtors?.[0]
  const supportName = firstRealtor?.name || branding.company_name || 'Support'
  const supportEmail = firstRealtor?.email || branding.company_email
  const supportPhone = firstRealtor?.phone || branding.company_phone

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
          <div className="p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-brand">Client dashboard</p>
                <h1 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">
                  Welcome back, {data?.user?.name || 'Client'}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  A clean view of your allocations, payments, outstanding balance, and official documents.
                </p>
              </div>
              <Link
                to="/client/receipts"
                className="inline-flex w-fit items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Receipts
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="mt-7">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted">Portfolio progress</p>
                  <p className="mt-1 text-lg font-semibold text-ink">{progress}% paid</p>
                </div>
                <p className="text-sm font-semibold text-muted">
                  {formatMoney(summary.total_paid)} of {formatMoney(summary.total_allocated)}
                </p>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-canvas">
                <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <aside className="border-t border-line bg-[#f8faf7] p-5 sm:p-6 lg:border-l lg:border-t-0">
            <p className="text-xs font-semibold uppercase text-muted">Account contact</p>
            <div className="mt-4 rounded-lg border border-line bg-white p-4">
              <p className="font-semibold text-ink">{supportName}</p>
              <p className="mt-1 text-sm text-muted">{firstRealtor?.company_name || 'Client services'}</p>
              <div className="mt-4 space-y-1 text-sm text-muted">
                <p>{supportPhone || 'No phone assigned'}</p>
                {supportEmail ? <p className="break-words">{supportEmail}</p> : null}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md border border-line bg-white p-3">
                <p className="text-xs text-muted">Active</p>
                <p className="mt-1 text-xl font-semibold">{summary.active_allocations || 0}</p>
              </div>
              <div className="rounded-md border border-line bg-white p-3">
                <p className="text-xs text-muted">Cleared</p>
                <p className="mt-1 text-xl font-semibold">{summary.completed_allocations || 0}</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} label="Properties" value={summary.total_properties || 0} hint="Allocated assets" />
        <StatCard icon={Landmark} label="Total Paid" value={formatMoney(summary.total_paid)} hint="Confirmed payments" />
        <StatCard icon={WalletCards} label="Outstanding" value={formatMoney(summary.outstanding_balance)} hint="Remaining balance" />
        <StatCard icon={ReceiptText} label="Receipts" value={summary.receipts_count || 0} hint="Documents issued" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Recent activity</h2>
              <p className="mt-1 text-sm text-muted">Latest confirmed payment movements.</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-md bg-brand/10 text-brand">
              <TrendingUp size={19} />
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            {recentPayments.length ? (
              recentPayments.map((payment) => (
                <ActivityRow
                  key={payment.id}
                  title={payment.property?.title || payment.allocation?.property?.title || 'Property payment'}
                  subtitle={payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : 'Payment recorded'}
                  amount={payment.amount}
                />
              ))
            ) : (
              <div className="rounded-md border border-dashed border-line bg-canvas p-5 text-sm text-muted">
                No payment activity has been recorded yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Documents</h2>
              <p className="mt-1 text-sm text-muted">Recent receipts ready to view or print.</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-md bg-brand/10 text-brand">
              <FileText size={19} />
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            {recentReceipts.length ? (
              recentReceipts.map((receipt) => (
                <Link
                  key={receipt.id}
                  to="/client/receipts"
                  className="flex items-center justify-between gap-4 rounded-md border border-line bg-white px-3 py-3 hover:bg-brand/5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{receipt.receipt_number}</p>
                    <p className="mt-1 text-xs text-muted">{receipt.issued_at ? new Date(receipt.issued_at).toLocaleDateString() : 'Receipt issued'}</p>
                  </div>
                  <CheckCircle2 size={18} className="shrink-0 text-brand" />
                </Link>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-line bg-canvas p-5 text-sm text-muted">
                No receipts are available yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/client/properties"
          className="flex items-center justify-between rounded-lg border border-line bg-white p-4 text-sm font-semibold text-ink shadow-sm hover:border-brand/40"
        >
          View allocated properties
          <ArrowRight size={17} className="text-brand" />
        </Link>
        <Link
          to="/client/profile"
          className="flex items-center justify-between rounded-lg border border-line bg-white p-4 text-sm font-semibold text-ink shadow-sm hover:border-brand/40"
        >
          Update profile details
          <ArrowRight size={17} className="text-brand" />
        </Link>
      </section>
    </div>
  )
}
