import {
  Banknote,
  Building2,
  Home,
  Landmark,
  Loader2,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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

  const stats = summary?.stats || emptyStats
  const cards = useMemo(
    () => [
      {
        label: 'Total Properties',
        value: stats.total_properties,
        helper: `${stats.available_properties} available`,
        icon: Building2,
      },
      {
        label: 'Sold Properties',
        value: stats.sold_properties,
        helper: `${stats.reserved_properties} currently reserved`,
        icon: Home,
      },
      {
        label: 'Total Clients',
        value: stats.total_clients,
        helper: 'Registered buyers and prospects',
        icon: Users,
      },
      {
        label: 'Revenue',
        value: formatMoney(stats.revenue),
        helper: 'Confirmed payments only',
        icon: Banknote,
      },
      {
        label: 'Outstanding',
        value: formatMoney(stats.outstanding_balances),
        helper: `${stats.active_allocations} active allocations`,
        icon: Landmark,
      },
    ],
    [stats],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-brand">Dashboard</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            Company overview
          </h2>
          <p className="mt-2 text-sm text-muted">
            Revenue, property movement, client growth, and outstanding balances.
          </p>
        </div>
        {loading ? (
          <div className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" />
            Loading
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
          <h3 className="text-base font-semibold text-ink">Property status</h3>
          <div className="mt-4 space-y-3">
            {(summary?.property_status_breakdown || []).map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <span className="capitalize text-sm text-muted">{item.status}</span>
                <span className="rounded-md bg-canvas px-2 py-1 text-sm font-semibold text-ink">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
          <h3 className="text-base font-semibold text-ink">Recent payments</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 pr-4 font-semibold">Client</th>
                  <th className="py-2 pr-4 font-semibold">Property</th>
                  <th className="py-2 pr-4 font-semibold">Amount</th>
                  <th className="py-2 font-semibold">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.recent_payments || []).map((payment) => (
                  <tr key={payment.id} className="border-b border-line last:border-0">
                    <td className="py-3 pr-4 text-ink">
                      {payment.client?.full_name || 'Client'}
                    </td>
                    <td className="py-3 pr-4 text-muted">
                      {payment.property?.title || 'Property'}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-ink">
                      {formatMoney(payment.amount)}
                    </td>
                    <td className="py-3 text-muted">
                      {payment.receipt?.receipt_number || 'Pending'}
                    </td>
                  </tr>
                ))}
                {!loading && !summary?.recent_payments?.length ? (
                  <tr>
                    <td className="py-6 text-muted" colSpan="4">
                      No payment activity yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
