import {
  Banknote,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Home,
  Loader2,
  Target,
  Trophy,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
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

  const loadDashboard = useCallback(async () => {
    try {
      const response = await api.get('/dashboard')
      setSummary(response.data.data)
      setError('')
    } catch {
      setError('Dashboard data could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    const resetAt = summary?.target_period?.resets_at
    if (!resetAt) return undefined

    const delay = new Date(resetAt).getTime() - Date.now() + 1000
    const timeout = window.setTimeout(loadDashboard, Math.max(delay, 0))
    return () => window.clearTimeout(timeout)
  }, [loadDashboard, summary?.target_period?.resets_at])

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
        helper: 'Confirmed sales, rent and service-charge payments',
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
  const leaderboardPeriod = summary?.realtor_leaderboard_period
  const previousLeaderboardSnapshot = summary?.previous_realtor_leaderboard_snapshot
  const topPropertiesSold = Math.max(
    ...topRealtors.map((realtor) => realtor.monthly_properties_sold_count || 0),
    1,
  )
  const activeTargetType = summary?.target_type || settings?.target_type || 'monthly'
  const activeTargetLabel = activeTargetType === 'weekly'
    ? 'Weekly'
    : activeTargetType === 'yearly'
      ? 'Yearly'
      : 'Monthly'
  const activeTargetAmount =
    summary?.target_amount ?? settings?.target_amount ?? summary?.monthly_target ?? 0
  const targetRevenue =
    summary?.target_revenue
    ?? (activeTargetType === 'monthly' ? summary?.stats?.monthly_revenue ?? 0 : 0)
  const targetProgress = activeTargetAmount > 0
    ? Math.min(
        100,
        Math.round(
          summary?.target_progress ?? ((targetRevenue / activeTargetAmount) * 100),
        ),
      )
    : 0
  const targetResetDate = summary?.target_period?.resets_at
    ? new Date(summary.target_period.resets_at)
    : null
  const targetResetLabel = targetResetDate && !Number.isNaN(targetResetDate.getTime())
    ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(targetResetDate)
    : null
  const targetRemaining = Math.max(activeTargetAmount - (targetRevenue || 0), 0)

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-sm">
        <div className="grid gap-3 p-3 sm:gap-5 sm:p-4 md:grid-cols-[1fr_320px] md:p-6 xl:grid-cols-[1fr_420px]">
          <div className="flex min-w-0 flex-col justify-center">
            <p className="text-xs font-medium text-brand sm:text-sm">{settings?.company_name || 'Company'}</p>
            <h2 className="mt-1.5 text-xl font-semibold text-ink sm:mt-2 sm:text-2xl md:text-3xl">
              <span className="sm:hidden">Dashboard overview</span>
              <span className="hidden sm:inline">Intelligent Real Estate Operations</span>
            </h2>
            <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-muted sm:block">
              A command view for revenue, inventory movement, allocations, and realtor performance.
            </p>
          </div>

          <div
            className="relative overflow-hidden rounded-xl bg-brand p-4 text-white shadow-lg shadow-brand/15 sm:rounded-2xl sm:p-5 md:p-6"
            style={{ backgroundImage: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))' }}
          >
            <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full border border-white/[0.07]" />
            <div className="pointer-events-none absolute -right-5 -top-9 h-32 w-32 rounded-full border border-white/[0.07]" />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-[#d4bb68] ring-1 ring-white/10">
                    <Target size={20} />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">Revenue goal</p>
                    <p className="mt-0.5 text-sm font-semibold">{activeTargetLabel} target</p>
                  </div>
                </div>
                <span className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-xs font-semibold tabular-nums">
                  {targetProgress}%
                </span>
              </div>

              <div className="mt-4 sm:mt-6">
                <p className="hidden text-xs text-white/55 sm:block">Target amount</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{formatMoney(activeTargetAmount)}</p>
              </div>

              <div className="mt-4 sm:mt-5">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-white/65">{formatMoney(targetRevenue || 0)} earned</span>
                  <span className="hidden text-white/45 sm:inline">{formatMoney(activeTargetAmount)} goal</span>
                </div>
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-white/15"
                  role="progressbar"
                  aria-label={`${activeTargetLabel} revenue target progress`}
                  aria-valuenow={targetProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#c9b35f] to-[#f0d989] transition-all duration-700"
                    style={{ width: `${targetProgress}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/10 pt-3 sm:mt-5 sm:gap-4 sm:pt-4">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-white/50 sm:text-[11px]">{targetRemaining > 0 ? 'Left to goal' : 'Goal reached'}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">{formatMoney(targetRemaining)}</p>
                </div>
                {targetResetLabel ? (
                  <p className="inline-flex items-center gap-1 text-right text-[10px] text-white/55 sm:gap-1.5 sm:text-[11px]">
                    <CalendarDays size={13} /> Renews {targetResetLabel}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end md:gap-4">
        <div>
          <p className="hidden text-sm font-medium text-brand sm:block">Dashboard</p>
          <h2 className="text-lg font-semibold text-ink sm:mt-1 sm:text-xl md:text-2xl">
            <span className="sm:hidden">At a glance</span>
            <span className="hidden sm:inline">Performance overview</span>
          </h2>
          <p className="mt-1 hidden max-w-2xl text-xs text-muted md:mt-2 md:block md:text-sm">
            A clean analytics view of revenue, growth, property movement,
            outstanding balances, and the latest payments.
          </p>
        </div>
        {loading ? (
          <div className="inline-flex items-center gap-2 self-start rounded-md border border-line bg-panel px-2.5 py-2 text-xs text-muted sm:px-3 md:text-sm">
            <Loader2 size={15} className="animate-spin" />
            <span className="hidden sm:inline">Loading dashboard</span>
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
          <StatCard key={card.label} {...card} compact />
        ))}
      </section>

      <section className="grid gap-2 md:gap-4 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="grid gap-2 md:gap-4">
          <div className="rounded-lg md:rounded-[24px] border border-line bg-panel p-3 md:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2 md:gap-4">
              <div>
                <p className="text-xs md:text-sm font-medium text-ink">Realtor leaderboard</p>
                <p className="mt-1 hidden text-xs text-muted md:block md:text-sm">
                  Ranked by completed sales for {leaderboardPeriod?.label || 'this month'}.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-1 md:px-3 md:py-1 text-xs font-semibold text-brand">
                <Trophy size={14} />
                {leaderboardPeriod?.label || 'Monthly'}
              </span>
            </div>

            {previousLeaderboardSnapshot ? (
              <p className="mt-3 hidden text-xs text-muted sm:block">
                Previous month saved: {previousLeaderboardSnapshot.label} ({previousLeaderboardSnapshot.entries_count} entries)
              </p>
            ) : null}

            <div className="mt-3 md:mt-6 space-y-2 md:space-y-3">
              {topRealtors.map((realtor, index) => {
                const propertiesSold = realtor.monthly_properties_sold_count || 0
                const width = topPropertiesSold ? (propertiesSold / topPropertiesSold) * 100 : 0

                return (
                  <div key={realtor.id} className="rounded-lg border border-line bg-white p-2.5 sm:rounded-xl sm:p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-xs font-bold ${
                          index === 0 ? 'bg-brand text-white' : 'bg-canvas text-muted'
                        }`}>
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{realtor.full_name}</p>
                          <p className="mt-1 hidden text-xs text-muted sm:block">
                            {realtor.company_name || 'Independent realtor'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-ink sm:text-sm">{propertiesSold} <span className="font-normal text-muted">sold</span></p>
                      </div>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-canvas sm:mt-3 sm:h-2">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted sm:text-xs">
                      <span className="truncate">{formatMoney(realtor.monthly_confirmed_revenue || 0)} revenue</span>
                      <span className="truncate text-right">{formatMoney(realtor.outstanding_balances || 0)} due</span>
                    </div>
                    <div className="mt-1 hidden items-center justify-between text-xs text-muted sm:flex">
                      <span>{formatMoney(realtor.monthly_installment_totals || 0)} installments</span>
                      <span>{realtor.monthly_clients_count ?? 0} new clients</span>
                    </div>
                  </div>
                )
              })}

              {!loading && topRealtors.length === 0 ? (
                <div className="rounded-xl bg-canvas p-3 text-xs text-muted sm:p-4 sm:text-sm">
                  No leaderboard activity yet.
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
                <p className="mt-1 hidden text-xs text-muted sm:block md:text-sm">
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
                <p className="mt-1 hidden text-xs text-muted sm:block md:text-sm">
                  Latest confirmed transactions at a glance.
                </p>
              </div>
              <span className="rounded-full bg-brand/10 px-2 py-1 md:px-3 md:py-1 text-xs font-semibold text-brand whitespace-nowrap">
                {summary?.recent_payments?.length ?? 0}<span className="hidden sm:inline"> items</span>
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
