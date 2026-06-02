import { useEffect, useState } from 'react'
import { balancesApi } from '../../services/clientApi'

const money = (value) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(value || 0))

export function ClientBalancesPage() {
  const [balances, setBalances] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    Promise.all([balancesApi.list(), balancesApi.summary()])
      .then(([balanceResponse, summaryResponse]) => {
        if (active) {
          setBalances(balanceResponse.data.balances || [])
          setSummary(summaryResponse.data)
        }
      })
      .catch(() => active && setError('Unable to load balances.'))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Outstanding Balances</h1>
        <p className="mt-1 text-sm text-muted">Live balance calculations from your allocations and confirmed payments.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-panel p-4">
          <p className="text-xs uppercase text-muted">Outstanding</p>
          <p className="mt-2 text-2xl font-semibold">{money(summary?.total_outstanding)}</p>
        </div>
        <div className="rounded-lg border border-line bg-panel p-4">
          <p className="text-xs uppercase text-muted">Paid</p>
          <p className="mt-2 text-2xl font-semibold">{money(summary?.total_paid)}</p>
        </div>
        <div className="rounded-lg border border-line bg-panel p-4">
          <p className="text-xs uppercase text-muted">Progress</p>
          <p className="mt-2 text-2xl font-semibold">{summary?.payment_progress || 0}%</p>
        </div>
      </div>

      {loading ? <div className="rounded-lg border border-line bg-panel p-6 text-sm text-muted">Loading balances...</div> : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div> : null}

      {!loading && !error && balances.length === 0 ? (
        <div className="rounded-lg border border-line bg-panel p-6 text-sm text-muted">No outstanding balances.</div>
      ) : null}

      <div className="grid gap-4">
        {balances.map((balance) => (
          <div key={balance.allocation_id} className="rounded-lg border border-line bg-panel p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">{balance.property?.title || 'Property'}</h2>
                <p className="text-sm text-muted">{balance.property?.location || 'Location unavailable'}</p>
              </div>
              <p className="text-lg font-semibold text-brand">{money(balance.outstanding_amount)}</p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-canvas">
              <div className="h-full bg-brand" style={{ width: `${Math.min(balance.payment_progress || 0, 100)}%` }} />
            </div>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <p><span className="text-muted">Total:</span> {money(balance.total_amount)}</p>
              <p><span className="text-muted">Paid:</span> {money(balance.paid_amount)}</p>
              <p><span className="text-muted">Status:</span> <span className="capitalize">{balance.status}</span></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
