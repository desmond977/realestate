import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  Clock3,
  CreditCard,
  KeyRound,
  Loader2,
  ReceiptText,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { formatMoney } from '../utils/formatters'

const periods = [
  { value: '30_days', label: 'Last 30 days' },
  { value: '90_days', label: 'Last 90 days' },
  { value: '12_months', label: 'Last 12 months' },
]

function formatDate(value) {
  return value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString() : '—'
}

function SummaryCard({ label, value, detail, icon: Icon, to, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand/10 text-brand',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    green: 'bg-emerald-100 text-emerald-700',
  }
  const content = (
    <div className="h-full rounded-xl border border-line bg-panel p-4 shadow-sm transition hover:border-brand/30 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-2 text-xl font-semibold text-ink sm:text-2xl">{value}</p>
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${tones[tone]}`}>
          <Icon size={19} />
        </span>
      </div>
      <p className="mt-3 text-xs text-muted">{detail}</p>
    </div>
  )

  return to ? <Link to={to} className="block">{content}</Link> : content
}

function RevenueTrend({ trend, loading }) {
  const maximum = Math.max(...trend.map((point) => point.amount), 1)
  const points = trend.map((point, index) => ({
    ...point,
    x: trend.length === 1 ? 360 : 12 + (index / (trend.length - 1)) * 696,
    y: 150 - (point.amount / maximum) * 126,
  }))

  return (
    <section className="rounded-xl border border-line bg-panel p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink">Rental revenue trend</h3>
          <p className="mt-1 text-sm text-muted">Confirmed rental payments received during the selected period.</p>
        </div>
        <ChartNoAxesCombined size={20} className="shrink-0 text-brand" />
      </div>

      {loading ? (
        <div className="grid h-48 place-items-center text-sm text-muted">Loading revenue trend…</div>
      ) : trend.length === 0 || trend.every((point) => point.amount === 0) ? (
        <div className="grid h-48 place-items-center text-sm text-muted">No rental collections in this period.</div>
      ) : (
        <div className="mt-4">
          <svg
            role="img"
            aria-label="Rental revenue trend chart"
            viewBox="0 0 720 180"
            className="h-48 w-full overflow-visible"
            preserveAspectRatio="none"
          >
            <line x1="12" y1="150" x2="708" y2="150" stroke="currentColor" className="text-line" strokeWidth="1" />
            <polyline
              points={points.map((point) => `${point.x},${point.y}`).join(' ')}
              fill="none"
              stroke="currentColor"
              className="text-brand"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map((point) => (
              <circle key={point.period} cx={point.x} cy={point.y} r="3" fill="currentColor" className="text-brand">
                <title>{`${point.label}: ${formatMoney(point.amount)}`}</title>
              </circle>
            ))}
          </svg>
          <div className="flex justify-between text-xs text-muted">
            <span>{trend[0]?.label}</span>
            <span>{trend[trend.length - 1]?.label}</span>
          </div>
        </div>
      )}
    </section>
  )
}

export function RentalDashboardPage() {
  const [period, setPeriod] = useState('12_months')
  const [result, setResult] = useState({ period: '', summary: null, error: '' })

  useEffect(() => {
    let active = true

    api.get('/rental-dashboard', { params: { period } })
      .then((response) => {
        if (active) setResult({ period, summary: response.data.data, error: '' })
      })
      .catch((requestError) => {
        if (active) {
          setResult({
            period,
            summary: null,
            error: requestError.response?.data?.message || 'Rental dashboard data could not be loaded.',
          })
        }
      })

    return () => {
      active = false
    }
  }, [period])

  const loading = result.period !== period
  const summary = loading ? null : result.summary
  const error = loading ? '' : result.error
  const stats = summary?.stats || {}
  const serviceCharges = summary?.service_charges || {}
  const trend = summary?.revenue_trend || []
  const upcoming = summary?.upcoming_rent_due || []
  const recentPayments = summary?.recent_rental_payments || []

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand">Rental management</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">Rental Dashboard</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Actual rental collections, lease balances, property occupancy, and service charge activity.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <span>Date range</span>
          <select
            aria-label="Rental dashboard date range"
            className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            {periods.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {error ? (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={17} />
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted"><Loader2 size={17} className="animate-spin" />Refreshing rental data…</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          label="Rental revenue collected"
          value={formatMoney(stats.rental_revenue_collected || 0)}
          detail="Confirmed rental payments in the selected date range"
          icon={CreditCard}
          to="/rental-payments"
          tone="green"
        />
        <SummaryCard
          label="Outstanding rent"
          value={formatMoney(stats.outstanding_rent || 0)}
          detail="Due or overdue balances on non-pending rental agreements"
          icon={ArrowDownRight}
          to="/rental-payments"
          tone="amber"
        />
        <SummaryCard
          label="Overdue rent"
          value={formatMoney(stats.overdue_rent || 0)}
          detail="Outstanding rent with a past due date"
          icon={Clock3}
          to="/rental-payments?status=overdue"
          tone="red"
        />
        <SummaryCard
          label="Occupied rental properties"
          value={stats.occupied_rental_properties || 0}
          detail="Properties with an active tenancy"
          icon={KeyRound}
          to="/rentals"
        />
        <SummaryCard
          label="Vacant rental properties"
          value={stats.vacant_rental_properties || 0}
          detail={`${stats.total_rental_properties || 0} rental properties in total`}
          icon={Building2}
          to="/rentals"
          tone="amber"
        />
      </div>

      <RevenueTrend trend={trend} loading={loading} />

      <section className="rounded-xl border border-line bg-panel p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-ink">Service charges</h3>
            <p className="mt-1 text-sm text-muted">
              Billed by billing date; collections by payment date; outstanding is the current balance of charges billed in this range.
            </p>
          </div>
          <Link to="/service-charges" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            View charges <ChevronRight size={16} />
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Amount billed" value={formatMoney(serviceCharges.amount_billed || 0)} detail="Charges billed in selected date range" icon={ReceiptText} to="/service-charges" />
          <SummaryCard label="Amount collected" value={formatMoney(serviceCharges.amount_collected || 0)} detail="Confirmed service charge payments in selected date range" icon={ArrowUpRight} to="/service-charges" tone="green" />
          <SummaryCard label="Outstanding balance" value={formatMoney(serviceCharges.outstanding_balance || 0)} detail="Current balance of charges billed in selected date range" icon={ArrowDownRight} to="/service-charges" tone="amber" />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-line bg-panel p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-ink">Upcoming rent due</h3>
              <p className="mt-1 text-sm text-muted">Unpaid balances due within the next 30 days.</p>
            </div>
            <CalendarDays size={19} className="text-brand" />
          </div>
          <div className="mt-4 space-y-2">
            {upcoming.map((item) => (
              <Link
                key={item.id}
                to={`/rental-payments/${item.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-line p-3 transition hover:border-brand/40 hover:bg-brand/5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{item.rental_agreement?.rental_property?.name || 'Rental property'}</p>
                  <p className="mt-1 truncate text-xs text-muted">{item.rental_agreement?.client?.full_name || 'Tenant'} · Due {formatDate(item.due_date)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-ink">{formatMoney(item.balance)}</p>
                  <p className="text-xs text-muted">remaining</p>
                </div>
              </Link>
            ))}
            {!loading && upcoming.length === 0 ? (
              <div className="rounded-lg bg-canvas px-4 py-8 text-center text-sm text-muted">No upcoming rent due in the next 30 days.</div>
            ) : null}
          </div>
          <Link to="/rental-payments" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            View rental payments <ChevronRight size={16} />
          </Link>
        </section>

        <section className="rounded-xl border border-line bg-panel p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-ink">Recent rental payments</h3>
              <p className="mt-1 text-sm text-muted">Confirmed transactions in the selected date range.</p>
            </div>
            <CreditCard size={19} className="text-brand" />
          </div>
          <div className="mt-4 space-y-2">
            {recentPayments.map((payment) => (
              <Link
                key={payment.id}
                to={`/rental-payments/${payment.rental_payment_period_id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-line p-3 transition hover:border-brand/40 hover:bg-brand/5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{payment.rental_agreement?.rental_property?.name || 'Rental property'}</p>
                  <p className="mt-1 truncate text-xs text-muted">{payment.rental_agreement?.client?.full_name || 'Tenant'} · {formatDate(payment.paid_at)}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-emerald-700">{formatMoney(payment.amount)}</p>
              </Link>
            ))}
            {!loading && recentPayments.length === 0 ? (
              <div className="rounded-lg bg-canvas px-4 py-8 text-center text-sm text-muted">No confirmed rental payments in this date range.</div>
            ) : null}
          </div>
          <Link to="/rental-payments" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            View payment history <ChevronRight size={16} />
          </Link>
        </section>
      </div>
    </section>
  )
}
