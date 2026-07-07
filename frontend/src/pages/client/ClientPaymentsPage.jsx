import { useEffect, useState } from 'react'
import { paymentsApi } from '../../services/clientApi'
import { formatPaymentDuration } from '../../utils/paymentDuration'

const money = (value) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(value || 0))

export function ClientPaymentsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    paymentsApi
      .list()
      .then((response) => active && setData(response.data))
      .catch(() => active && setError('Unable to load your payments.'))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [])

  const payments = data?.payments || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Payments</h1>
        <p className="mt-1 text-sm text-muted">Confirmed and pending payments on your allocations.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-panel p-4">
          <p className="text-xs font-medium uppercase text-muted">Total Paid</p>
          <p className="mt-2 text-2xl font-semibold">{money(data?.total_paid)}</p>
        </div>
        <div className="rounded-lg border border-line bg-panel p-4">
          <p className="text-xs font-medium uppercase text-muted">Pending</p>
          <p className="mt-2 text-2xl font-semibold">{money(data?.total_pending)}</p>
        </div>
      </div>

      {loading ? <div className="rounded-lg border border-line bg-panel p-6 text-sm text-muted">Loading payments...</div> : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div> : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="bg-canvas text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {payments.length ? (
                  payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-3">{payment.property?.title || payment.allocation?.property?.title || 'Property payment'}</td>
                      <td className="px-4 py-3 font-semibold">{money(payment.amount)}</td>
                      <td className="px-4 py-3">{payment.payment_method || 'N/A'}</td>
                      <td className="px-4 py-3">{formatPaymentDuration(payment.allocation)}</td>
                      <td className="px-4 py-3 capitalize">{payment.status}</td>
                      <td className="px-4 py-3">{payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-muted">No payments found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
