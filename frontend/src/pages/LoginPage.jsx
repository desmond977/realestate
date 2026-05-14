import { Building2, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await login(form)
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.errors?.email?.[0] ||
          'Unable to sign in with those credentials.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-canvas lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex items-center px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-lg bg-brand text-white">
              <Building2 size={22} />
            </div>
            <div>
              <p className="text-lg font-semibold text-ink">EstateOps</p>
              <p className="text-sm text-muted">Real estate management</p>
            </div>
          </div>

          <h1 className="text-3xl font-semibold text-ink">Welcome back</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Sign in to manage properties, clients, allocations, payments, and
            receipts.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-medium text-ink">Email</span>
              <span className="mt-2 flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2.5 focus-within:border-brand">
                <Mail size={18} className="text-muted" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className="w-full border-0 bg-transparent text-sm outline-none"
                  placeholder="admin@example.com"
                  required
                />
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Password</span>
              <span className="mt-2 flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2.5 focus-within:border-brand">
                <Lock size={18} className="text-muted" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  className="w-full border-0 bg-transparent text-sm outline-none"
                  placeholder="Password"
                  required
                />
              </span>
            </label>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </section>

      <section className="hidden border-l border-line bg-brand-dark px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-sm font-medium text-white/70">Operations HQ</p>
          <h2 className="mt-4 max-w-lg text-4xl font-semibold leading-tight">
            Track real estate revenue, allocations, and client activity from one
            clean workspace.
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {['Properties', 'Payments', 'Receipts'].map((item) => (
            <div key={item} className="rounded-lg bg-white/10 p-4">
              <p className="text-sm font-medium">{item}</p>
              <p className="mt-1 text-xs text-white/65">API connected</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
