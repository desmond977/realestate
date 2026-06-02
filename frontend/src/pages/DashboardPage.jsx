import {
  Banknote,
  Building2,
  ChevronRight,
  ClipboardList,
  Home,
  Loader2,
  Trophy,
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
  total_realtors: 0,
  total_plots: 0,
  available_plots: 0,
  reserved_plots: 0,
  sold_plots: 0,
}

function realtorName(record) {
  return record?.realtor?.full_name || record?.client?.realtor?.full_name || 'Direct'
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
        tone: 'brand',
      },
      {
        label: 'Plots Sold',
        value: stats.sold_plots,
        helper: `${stats.available_plots} available plots`,
        icon: Home,
        tone: 'accent',
      },
      {
        label: 'Active Allocations',
        value: stats.active_allocations,
        helper: `${stats.completed_allocations} completed`,
        icon: ClipboardList,
        tone: 'ink',
      },
      {
        label: 'Clients',
        value: stats.total_clients,
        helper: `${stats.total_realtors} linked realtors`,
        icon: Users,
        tone: 'brand',
      },
      {
        label: 'Inventory',
        value: stats.total_plots,
        helper: `${stats.total_properties} properties`,
        icon: Building2,
        tone: 'accent',
      },
    ],
    [stats],
  )

  const topRealtors = summary?.top_realtors || []
  const topPropertiesSold = Math.max(
    ...topRealtors.map((realtor) => realtor.properties_sold_count || 0),
    1,
  )
  const activeTargetType = settings?.target_type || 'monthly'
  const activeTargetLabel = activeTargetType === 'weekly' ? 'Weekly target' : 'Monthly target'
  const activeTargetAmount =
    settings?.target_amount ?? (activeTargetType === 'monthly' ? summary?.monthly_target ?? 0 : 0)
  const targetProgress = activeTargetAmount > 0
    ? Math.min(
        100,
        Math.round(
          (stats.revenue / activeTargetAmount) * 100,
        ),
      )
    : 0

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-sm">
        <div className="grid gap-5 p-4 md:grid-cols-[1fr_320px] md:p-6 xl:grid-cols-[1fr_420px]">
          <div className="flex min-w-0 flex-col justify-center">
            <p className="text-sm font-medium text-brand">{settings?.company_name || 'Company'}</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">
              Intelligent Real Estate Operations
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              A command view for revenue, inventory movement, allocations, and realtor performance.
            </p>
          </div>

          <div className="rounded-lg border border-line bg-ink p-4 text-white monthly-target-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase text-white/60">{activeTargetLabel}</p>
                <p className="mt-2 text-2xl font-semibold">{formatMoney(activeTargetAmount)}</p>
              </div>
              <span className="rounded-md bg-white/10 px-3 py-1 text-xs font-semibold">
                {targetProgress}% reached
              </span>
            </div>
            <div className="mt-5 h-2 rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-accent transition-all duration-700"
                style={{ width: `${targetProgress}%` }}
              />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-white/55">Outstanding</p>
                <p className="mt-1 font-semibold">{formatMoney(stats.outstanding_balances)}</p>
              </div>
              <div>
                <p className="text-white/55">Completed</p>
                <p className="mt-1 font-semibold">{stats.completed_allocations} allocations</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
            <div className="flex items-center justify-between gap-2 md:gap-4">
              <div>
                <p className="text-xs md:text-sm font-medium text-ink">Realtor leaderboard</p>
                <p className="mt-1 text-xs md:text-sm text-muted">
                  Ranked by completed property sales.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-1 md:px-3 md:py-1 text-xs font-semibold text-brand">
                <Trophy size={14} />
                Monthly
              </span>
            </div>

            <div className="mt-3 md:mt-6 space-y-2 md:space-y-3">
              {topRealtors.map((realtor, index) => {
                const propertiesSold = realtor.properties_sold_count || 0
                const width = topPropertiesSold ? (propertiesSold / topPropertiesSold) * 100 : 0

                return (
                  <div key={realtor.id} className="rounded-xl border border-line bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-xs font-bold ${
                          index === 0 ? 'bg-brand text-white' : 'bg-canvas text-muted'
                        }`}>
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{realtor.full_name}</p>
                          <p className="mt-1 text-xs text-muted">
                            {realtor.company_name || 'Independent realtor'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-ink">{propertiesSold}</p>
                        <p className="text-xs text-muted">sold</p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-canvas">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted">
                      <span>{formatMoney(realtor.confirmed_revenue || 0)} revenue</span>
                      <span>{formatMoney(realtor.outstanding_balances || 0)} outstanding</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted">
                      <span>{formatMoney(realtor.installment_totals || 0)} installments</span>
                      <span>{realtor.clients_count ?? 0} clients</span>
                    </div>
                  </div>
                )
              })}

              {!loading && topRealtors.length === 0 ? (
                <div className="rounded-xl bg-canvas p-4 text-sm text-muted">
                  No completed realtor property sales yet.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-2 md:gap-4">
          <div className="rounded-lg md:rounded-[24px] border border-line bg-panel p-3 md:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2 md:gap-4">
              <div>
                <p className="text-xs md:text-sm font-medium text-ink">Inventory snapshot</p>
                <p className="mt-1 text-xs md:text-sm text-muted">
                  Current plot inventory and quick navigation.
                </p>
              </div>
              <span className="rounded-full bg-brand/10 px-2 py-1 md:px-3 md:py-1 text-xs font-semibold text-brand whitespace-nowrap">
                {stats.total_properties} properties
              </span>
            </div>

            <div className="mt-3 md:mt-6 space-y-2 md:space-y-3">
              {(summary?.property_inventory_breakdown || []).map((item) => (
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
                    <th className="py-2 md:py-3 pr-2 md:pr-4 font-semibold hidden sm:table-cell">Realtor</th>
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
                        {realtorName(payment)}
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
