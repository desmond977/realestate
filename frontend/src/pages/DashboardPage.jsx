import {
  Banknote,
  Building2,
  ChevronRight,
  Home,
  Landmark,
  Loader2,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { StatCard } from '../components/ui/StatCard.jsx'
import { formatMoney } from '../utils/formatters'

const emptyStats = {
  total_properties: 0,
  available_properties: 0,
  reserved_properties: 0,
  sold_properties: 0,
  total_clients: 0,
  revenue: 0,
  outstanding_balances: 0,
  active_allocations: 0,
  completed_allocations: 0,
}

export function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      try {
        const response = await api.get('/dashboard')

        if (active) {
          setSummary(response.data.data)
          setError('')
        }
      } catch {
        if (active) {
          setError('Dashboard data could not be loaded.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadSettings() {
      try {
        const response = await api.get('/settings/company')

        if (active) {
          setSettings(response.data.data.settings)
        }
      } catch {
        if (active) {
          setSettings(null)
        }
      }
    }

    loadSettings()

    return () => {
      active = false
    }
  }, [])

  const stats = summary?.stats || emptyStats
  const cards = useMemo(
    () => [
      {
        label: 'Revenue',
        value: formatMoney(stats.revenue),
        helper: 'Confirmed payments only',
        icon: Banknote,
      },
      {
        label: 'Sold Properties',
        value: stats.sold_properties,
        helper: `${stats.reserved_properties} currently reserved`,
        icon: Home,
      },
      {
        label: 'Outstanding',
        value: formatMoney(stats.outstanding_balances),
        helper: `${stats.active_allocations} active allocations`,
        icon: Landmark,
      },
      {
        label: 'Clients',
        value: stats.total_clients,
        helper: 'Active and registered',
        icon: Users,
      },
      {
        label: 'Properties',
        value: stats.total_properties,
        helper: `${stats.available_properties} available`,
        icon: Building2,
      },
    ],
    [stats],
  )

  const weeklySales = summary?.weekly_sales_breakdown || []
  const weeklyMax = Math.max(...weeklySales.map((item) => item.amount), 1)
  const activeTargetType = settings?.target_type || 'monthly'
  const activeTargetLabel = activeTargetType === 'weekly' ? 'Weekly target' : 'Monthly target'
  const activeTargetAmount =
    settings?.target_amount ?? (activeTargetType === 'monthly' ? summary?.monthly_target ?? 0 : 0)
  const weeklySalesTotal = weeklySales.reduce((sum, item) => sum + item.amount, 0)
  const targetProgress = activeTargetAmount > 0
    ? Math.min(
        100,
        Math.round(
          ((activeTargetType === 'weekly' ? weeklySalesTotal : stats.revenue) / activeTargetAmount) * 100,
        ),
      )
    : 0

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="flex flex-col justify-between gap-2 md:gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-brand">Dashboard</p>
          <h2 className="mt-1 text-xl md:text-2xl font-semibold text-ink">
            Performance overview
          </h2>
          <p className="mt-1 md:mt-2 max-w-2xl text-xs md:text-sm text-muted">
            A clean analytics view of revenue, growth, property movement,
            outstanding balances, and the latest payments.
          </p>
        </div>
        {loading ? (
          <div className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-xs md:text-sm text-muted">
            <Loader2 size={16} className="animate-spin" />
            Loading dashboard
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-2 md:gap-4 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="grid gap-2 md:gap-4">
          <div className="rounded-lg md:rounded-[24px] border border-line bg-panel p-3 md:p-6 shadow-sm">
            <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium uppercase tracking-[0.25em] text-brand">
                  {activeTargetLabel}
                </p>
                <h3 className="mt-2 md:mt-3 text-2xl md:text-3xl font-semibold text-ink">
                  {formatMoney(activeTargetAmount)}
                </h3>
                <p className="mt-1 md:mt-2 text-xs md:text-sm text-muted">
                  Goal progress for the active {activeTargetType} target across the sales pipeline.
                </p>
                {settings ? (
                  <p className="mt-3 text-xs text-ink/80">
                    Active dashboard target: {settings.target_type === 'weekly' ? 'Weekly' : 'Monthly'}{' '}
                    {formatMoney(settings.target_amount)}
                  </p>
                ) : null}
              </div>
              <div className="rounded-full border border-line bg-canvas px-3 py-1 md:px-4 md:py-2 text-xs md:text-sm font-semibold text-brand whitespace-nowrap">
                {targetProgress}% reached
              </div>
            </div>

            <div className="mt-3 md:mt-6 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">Progress</p>
              <div className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white shadow-sm animate-floating">
                {targetProgress}% reached
              </div>
            </div>

            <div className="mt-3 md:mt-6 rounded-full bg-canvas p-1 relative">
              <div
                className="h-2 md:h-3 rounded-full bg-brand transition-all duration-700 ease-out"
                style={{ width: `${targetProgress}%` }}
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] md:text-xs font-semibold text-ink/80">
                {targetProgress}% complete
              </div>
            </div>

            <div className="mt-3 md:mt-6 grid gap-2 md:gap-4 sm:grid-cols-2">
              <div className="rounded-2xl md:rounded-3xl bg-canvas p-3 md:p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Revenue</p>
                <p className="mt-2 md:mt-3 text-lg md:text-2xl font-semibold text-ink">
                  {formatMoney(stats.revenue)}
                </p>
              </div>
              <div className="rounded-2xl md:rounded-3xl bg-canvas p-3 md:p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">
                  Outstanding
                </p>
                <p className="mt-2 md:mt-3 text-lg md:text-2xl font-semibold text-ink">
                  {formatMoney(stats.outstanding_balances)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg md:rounded-[24px] border border-line bg-panel p-3 md:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2 md:gap-4">
              <div>
                <p className="text-xs md:text-sm font-medium text-ink">Weekly sales</p>
                <p className="mt-1 text-xs md:text-sm text-muted">
                  Confirmed payment volume over the last 7 days.
                </p>
              </div>
              <span className="rounded-full bg-brand/10 px-2 py-1 md:px-3 md:py-1 text-xs font-semibold text-brand">
                {weeklySales.length} days
              </span>
            </div>

            <div className="mt-3 md:mt-6 space-y-2 md:space-y-4">
              {weeklySales.map((entry) => {
                const width = weeklyMax ? (entry.amount / weeklyMax) * 100 : 0

                return (
                  <div key={entry.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>{entry.label}</span>
                      <span className="text-xs">{formatMoney(entry.amount)}</span>
                    </div>
                    <div className="h-2 md:h-3 overflow-hidden rounded-full bg-canvas">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-2 md:gap-4">
          <div className="rounded-lg md:rounded-[24px] border border-line bg-panel p-3 md:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2 md:gap-4">
              <div>
                <p className="text-xs md:text-sm font-medium text-ink">Inventory snapshot</p>
                <p className="mt-1 text-xs md:text-sm text-muted">
                  Current property status and quick navigation.
                </p>
              </div>
              <span className="rounded-full bg-brand/10 px-2 py-1 md:px-3 md:py-1 text-xs font-semibold text-brand whitespace-nowrap">
                {stats.total_properties} properties
              </span>
            </div>

            <div className="mt-3 md:mt-6 space-y-2 md:space-y-3">
              {(summary?.property_status_breakdown || []).map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between rounded-xl md:rounded-2xl bg-canvas px-3 py-2 md:px-4 md:py-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-brand" />
                    <span className="capitalize text-xs md:text-sm text-ink">{item.status}</span>
                  </div>
                  <span className="text-xs md:text-sm font-semibold text-muted">{item.count}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 md:mt-6 grid gap-2 md:gap-3">
              <Link
                to="/properties"
                className="inline-flex items-center justify-between rounded-xl md:rounded-2xl border border-line bg-canvas px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm font-medium text-ink hover:bg-brand/5"
              >
                <span>View properties</span>
                <ChevronRight size={16} className="md:w-4 md:h-4" />
              </Link>
              <Link
                to="/payments"
                className="inline-flex items-center justify-between rounded-xl md:rounded-2xl border border-line bg-canvas px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm font-medium text-ink hover:bg-brand/5"
              >
                <span>Review payments</span>
                <ChevronRight size={16} className="md:w-4 md:h-4" />
              </Link>
              <Link
                to="/clients"
                className="inline-flex items-center justify-between rounded-xl md:rounded-2xl border border-line bg-canvas px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm font-medium text-ink hover:bg-brand/5"
              >
                <span>Manage clients</span>
                <ChevronRight size={16} className="md:w-4 md:h-4" />
              </Link>
            </div>
          </div>

          <div className="rounded-lg md:rounded-[24px] border border-line bg-panel p-3 md:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2 md:gap-4">
              <div>
                <p className="text-xs md:text-sm font-medium text-ink">Recent payments</p>
                <p className="mt-1 text-xs md:text-sm text-muted">
                  Latest confirmed transactions at a glance.
                </p>
              </div>
              <span className="rounded-full bg-brand/10 px-2 py-1 md:px-3 md:py-1 text-xs font-semibold text-brand whitespace-nowrap">
                {summary?.recent_payments?.length ?? 0} items
              </span>
            </div>

            <div className="mt-3 md:mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-xs md:text-sm text-ink">
                <thead className="text-xs uppercase text-muted">
                  <tr className="border-b border-line">
                    <th className="py-2 md:py-3 pr-2 md:pr-4 font-semibold">Client</th>
                    <th className="py-2 md:py-3 pr-2 md:pr-4 font-semibold hidden sm:table-cell">Property</th>
                    <th className="py-2 md:py-3 pr-2 md:pr-4 font-semibold">Amount</th>
                    <th className="py-2 md:py-3 font-semibold hidden md:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary?.recent_payments?.map((payment) => (
                    <tr key={payment.id} className="border-b border-line last:border-0">
                      <td className="py-2 md:py-3 pr-2 md:pr-4 font-medium text-ink text-xs md:text-sm">
                        {payment.client?.full_name || 'Client'}
                      </td>
                      <td className="py-2 md:py-3 pr-2 md:pr-4 text-muted hidden sm:table-cell text-xs md:text-sm">
                        {payment.property?.title || 'Property'}
                      </td>
                      <td className="py-2 md:py-3 pr-2 md:pr-4 font-semibold text-ink text-xs md:text-sm">
                        {formatMoney(payment.amount)}
                      </td>
                      <td className="py-2 md:py-3 text-green-700 hidden md:table-cell text-xs md:text-sm">
                        {payment.status}
                      </td>
                    </tr>
                  ))}

                  {!loading && !summary?.recent_payments?.length ? (
                    <tr>
                      <td className="py-4 md:py-6 text-muted text-xs md:text-sm" colSpan="4">
                        No payment activity yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
