import { useEffect, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { api } from '../../api/client'
import { formatMoney } from '../../utils/formatters'

function isAdmin() {
  try { return JSON.parse(localStorage.getItem('auth_user') || '{}')?.role === 'admin' } catch { return false }
}
function date(value) { return value ? new Date(value).toLocaleString() : '—' }

export function PaystackClientTransactionsPanel() {
  const [admin, setAdmin] = useState(false)
  const [search, setSearch] = useState('')
  const [result, setResult] = useState({ rows: [], loading: true, error: '' })
  useEffect(() => setAdmin(isAdmin()), [])
  useEffect(() => {
    if (!admin) return
    let active = true
    setResult((current) => ({ ...current, loading: true, error: '' }))
    const timer = window.setTimeout(() => api.get('/paystack/client-transactions', { params: { search: search.trim() || undefined, per_page: 50 } })
      .then((response) => active && setResult({ rows: response.data.data || [], loading: false, error: '' }))
      .catch((error) => active && setResult({ rows: [], loading: false, error: error.response?.data?.message || 'Unable to load Paystack transactions.' })), 180)
    return () => { active = false; window.clearTimeout(timer) }
  }, [admin, search])
  if (!admin) return null
  return <section className="space-y-4 rounded-2xl border border-line bg-panel p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-brand">Client online payments</p><h2 className="mt-1 text-lg font-semibold text-ink">Paystack transaction history</h2><p className="mt-1 text-sm text-muted">Verified rental and service charge checkout attempts.</p></div><label className="relative block w-full sm:max-w-xs"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input aria-label="Search Paystack transactions" className="w-full rounded-md border border-line bg-white py-2.5 pl-9 pr-3 text-sm" placeholder="Search reference or tenant" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>{result.error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{result.error}</p> : null}{result.loading ? <div className="flex min-h-24 items-center justify-center gap-2 text-sm text-muted"><Loader2 size={17} className="animate-spin" />Loading Paystack transactions</div> : result.rows.length ? <div className="overflow-x-auto rounded-xl border border-line bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-canvas text-xs uppercase text-muted"><tr><th className="px-3 py-3">Client / property</th><th className="px-3 py-3">Type / reference</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Receipt</th><th className="px-3 py-3">Created / verified</th></tr></thead><tbody className="divide-y divide-line">{result.rows.map((row) => <tr key={row.id} className="align-top"><td className="px-3 py-3"><p className="font-medium text-ink">{row.client?.full_name || row.client?.email || 'Client'}</p><p className="text-xs text-muted">{row.property || 'Rental property'}</p></td><td className="px-3 py-3"><span className="text-xs capitalize text-muted">{row.category?.replace('_', ' ')}</span><p className="font-mono text-xs">{row.reference}</p>{row.transaction_id ? <p className="mt-1 font-mono text-[11px] text-muted">{row.transaction_id}</p> : null}</td><td className="px-3 py-3 font-semibold tabular-nums">{formatMoney(row.amount)}</td><td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${row.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : row.status === 'failed' ? 'bg-red-50 text-red-700' : row.status === 'review' ? 'bg-amber-50 text-amber-800' : 'bg-canvas text-muted'}`}>{row.status}</span>{row.failure_reason ? <p className="mt-1 max-w-xs text-xs text-muted">{row.failure_reason}</p> : null}</td><td className="px-3 py-3 text-xs">{row.receipt?.receipt_number || '—'}</td><td className="px-3 py-3 text-xs text-muted">{date(row.created_at)}{row.verified_at ? <p className="mt-1">Verified {date(row.verified_at)}</p> : null}</td></tr>)}</tbody></table></div> : <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">No Paystack transactions found.</p>}</section>
}
