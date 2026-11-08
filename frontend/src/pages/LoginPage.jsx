import { ArrowRight, Building2, LockKeyhole, Mail } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { assetUrl } from '../api/client'
import { applyBranding, getPersistedBranding, getPersistedUserTheme } from '../utils/theme.js'

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [branding, setBranding] = useState(() => getPersistedBranding())

  useEffect(() => {
    applyBranding({ ...getPersistedUserTheme(), ...branding })
  }, [branding])

  useEffect(() => {
    function onSettings() {
      try {
        setBranding(getPersistedBranding())
      } catch {
        setBranding(getPersistedBranding())
      }
    }

    window.addEventListener('estateopsSettingsUpdated', onSettings)
    return () => window.removeEventListener('estateopsSettingsUpdated', onSettings)
  }, [])

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
    <main className="min-h-screen bg-[#f8f9f7] lg:grid lg:grid-cols-[minmax(420px,0.9fr)_minmax(0,1.1fr)]">
      <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-5 py-8 sm:px-8 lg:hidden">
        <img
          src="/admin-login-partnership.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/35 via-brand-dark/50 to-brand-dark/75" />

        <div className="relative z-10 w-full max-w-md rounded-[28px] border border-white/70 bg-white/[0.96] p-6 shadow-[0_24px_80px_rgba(12,24,16,0.3)] backdrop-blur-xl sm:p-8">
          <div className="mb-8 flex items-center gap-3">
            {branding?.company_logo ? (
              <img
                src={assetUrl(branding.company_logo)}
                alt={branding.company_name || 'Company logo'}
                className="h-11 w-11 rounded-xl object-contain"
              />
            ) : (
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-white shadow-sm">
                <Building2 size={21} />
              </div>
            )}
            <p className="min-w-0 truncate text-base font-bold tracking-tight text-[#202821]">
              {branding.company_name || 'EstateOps'}
            </p>
          </div>

          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Admin portal</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#202821]">Welcome back</h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#69746c]">
              Sign in to manage properties, clients, and payments in one place.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#303a33]">Email address</span>
              <span className="flex items-center gap-3 rounded-xl border border-[#dfe5e0] bg-white px-4 py-3.5 transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
                <Mail size={18} className="shrink-0 text-[#849087]" />
                <input
                  type="email"
                  autoComplete="username"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full border-0 bg-transparent text-base text-[#202821] outline-none placeholder:text-[#9ba49d]"
                  placeholder="you@company.com"
                  required
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#303a33]">Password</span>
              <span className="flex items-center gap-3 rounded-xl border border-[#dfe5e0] bg-white px-4 py-3.5 transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
                <LockKeyhole size={18} className="shrink-0 text-[#849087]" />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  className="w-full border-0 bg-transparent text-base text-[#202821] outline-none placeholder:text-[#9ba49d]"
                  placeholder="Enter your password"
                  required
                />
              </span>
            </label>

            {error ? (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/15 transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Signing in...' : 'Sign in'}
              {!loading && <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>
        </div>
      </section>

      <section className="order-last hidden min-h-[620px] items-center justify-center px-6 py-12 sm:px-12 lg:order-first lg:flex lg:px-14 xl:px-20">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 sm:mb-14">
            {branding?.company_logo ? (
              <img
                src={assetUrl(branding.company_logo)}
                alt={branding.company_name || 'Company logo'}
                className="h-12 w-12 rounded-xl object-contain"
              />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand text-white shadow-sm">
                <Building2 size={23} />
              </div>
            )}
            <div>
              <p className="text-base font-bold tracking-tight text-[#202821]">
                {branding.company_name || 'EstateOps'}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-4xl font-semibold tracking-tight text-[#202821] sm:text-[2.75rem]">
              Welcome back
            </h1>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#303a33]">Email address</span>
              <span className="flex items-center gap-3 rounded-xl border border-[#dfe5e0] bg-white px-4 py-3.5 transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
                <Mail size={18} className="shrink-0 text-[#849087]" />
                <input
                  type="email"
                  autoComplete="username"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full border-0 bg-transparent text-sm text-[#202821] outline-none placeholder:text-[#9ba49d]"
                  placeholder="you@company.com"
                  required
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#303a33]">Password</span>
              <span className="flex items-center gap-3 rounded-xl border border-[#dfe5e0] bg-white px-4 py-3.5 transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
                <LockKeyhole size={18} className="shrink-0 text-[#849087]" />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  className="w-full border-0 bg-transparent text-sm text-[#202821] outline-none placeholder:text-[#9ba49d]"
                  placeholder="Enter your password"
                  required
                />
              </span>
            </label>

            {error ? (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/15 transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Signing in...' : 'Sign in'}
              {!loading && <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>

        </div>
      </section>

      <aside className="relative order-first hidden min-h-screen flex-col justify-between overflow-hidden bg-brand-dark px-10 py-10 lg:order-last lg:flex xl:px-14 xl:py-12">
        <img
          src="/admin-login-partnership.jpg"
          alt="Business partners shaking hands above miniature homes and property documents"
          className="absolute inset-0 h-full w-full object-cover object-[center_56%]"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-dark/85 via-brand-dark/35 to-brand/10" />
        <div className="relative z-10 flex items-center justify-end text-white/85">
          <span className="rounded-full border border-white/30 bg-black/10 px-3 py-1.5 text-[11px] font-medium backdrop-blur-sm">ADMIN PORTAL</span>
        </div>
        <div className="relative z-10 mt-16 max-w-xl text-white lg:mx-auto lg:mt-0 lg:flex lg:w-full lg:max-w-none lg:flex-1 lg:flex-col lg:justify-center lg:text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
            One workspace. Better oversight.
          </p>
          <h2 className="text-3xl font-semibold leading-tight sm:text-4xl xl:text-[2.8rem]">
            Manage every property with confidence.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/85 sm:text-base lg:mx-auto">
            Keep client relationships, property activity, and payments moving from one clear dashboard.
          </p>
        </div>
      </aside>
    </main>
  )
}
