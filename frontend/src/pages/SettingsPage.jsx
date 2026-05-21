import { Loader2, Settings2, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { formatMoney } from '../utils/formatters'

const defaultConfig = {
  target_type: 'monthly',
  target_amount: 250000,
  company_name: '',
  company_email: '',
  company_phone: '',
  company_address: '',
  company_logo: null,
}

export function SettingsPage() {
  const [config, setConfig] = useState(defaultConfig)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true

    async function loadSettings() {
      try {
        const response = await api.get('/settings/company')

        if (active) {
          setConfig({ ...defaultConfig, ...response.data.data.settings })
          setError('')
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || 'Company settings could not be loaded.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadSettings()

    return () => {
      active = false
    }
  }, [])

  function updateField(field, value) {
    setConfig((current) => ({ ...current, [field]: value }))
    setSaved(false)
  }

  async function submitSettings(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setSaved(false)

    try {
      const response = await api.put('/settings/company', config)
      setConfig({ ...defaultConfig, ...response.data.data.settings })
      window.dispatchEvent(new Event('estateopsSettingsUpdated'))
      setSaved(true)
    } catch (err) {
      const errors = err.response?.data?.errors
      setError(
        errors
          ? Object.values(errors).flat().join(' ')
          : err.response?.data?.message || 'Company settings could not be saved.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const targetHint =
    config.target_type === 'weekly'
      ? 'Weekly target is used for dashboard comparisons.'
      : 'Monthly target is shown in the dashboard analytics card.'

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand">Settings</p>
            <h1 className="mt-2 text-2xl font-semibold text-ink">Admin & dashboard setup</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Update administrator contact details and set the active sales target for the dashboard.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2 text-sm text-ink">
            <Settings2 size={18} /> Company settings
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form
          onSubmit={submitSettings}
          className="rounded-3xl border border-line bg-panel p-6 shadow-sm"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-ink">Company name</span>
              <input
                value={config.company_name}
                onChange={(event) => updateField('company_name', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                placeholder="Your company name"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Company email</span>
              <input
                type="email"
                value={config.company_email}
                onChange={(event) => updateField('company_email', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                placeholder="contact@company.com"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-ink">Company phone</span>
              <input
                value={config.company_phone}
                onChange={(event) => updateField('company_phone', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                placeholder="0803 000 0000"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-ink">Company address</span>
              <input
                value={config.company_address}
                onChange={(event) => updateField('company_address', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                placeholder="Street, City, Country"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-ink">Company logo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    updateField('company_logo', reader.result)
                  }
                  reader.readAsDataURL(file)
                }}
                className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
              {config.company_logo ? (
                <div className="mt-4 flex items-center gap-4 rounded-3xl border border-line bg-canvas p-4">
                  <img src={config.company_logo} alt="Company logo" className="h-16 w-16 rounded-md object-contain" />
                  <p className="text-sm text-muted">Preview of the company logo shown across the app.</p>
                </div>
              ) : null}
            </label>
          </div>

          <div className="mt-6 rounded-3xl border border-line bg-canvas p-5">
            <p className="text-sm font-semibold text-ink">Dashboard target</p>
            <p className="mt-2 text-sm text-muted">Choose the active target type for dashboard reporting.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block rounded-2xl border border-line bg-white p-4">
                <div className="flex items-center justify-between text-sm font-medium text-ink">
                  <span>Monthly target</span>
                  <input
                    type="radio"
                    name="targetType"
                  checked={config.target_type === 'monthly'}
                  onChange={() => updateField('target_type', 'monthly')}
                  className="accent-brand"
                />
                </div>
                <input
                  type="number"
                  min="0"
                  value={config.target_amount}
                  onChange={(event) => updateField('target_amount', Number(event.target.value))}
                  className="mt-3 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                />
              </label>

              <label className="block rounded-2xl border border-line bg-white p-4">
                <div className="flex items-center justify-between text-sm font-medium text-ink">
                  <span>Weekly target</span>
                  <input
                    type="radio"
                    name="targetType"
                  checked={config.target_type === 'weekly'}
                  onChange={() => updateField('target_type', 'weekly')}
                  className="accent-brand"
                />
                </div>
                <input
                  type="number"
                  min="0"
                  value={config.target_amount}
                  onChange={(event) => updateField('target_amount', Number(event.target.value))}
                  className="mt-3 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                />
              </label>
            </div>

            <p className="mt-4 text-sm text-muted">{targetHint}</p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            {saved ? (
              <p className="text-sm font-medium text-brand">Settings saved.</p>
            ) : null}
            <button
              type="submit"
              disabled={submitting || loading}
              className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              {submitting ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
              Save settings
            </button>
          </div>
        </form>

        <aside className="space-y-4 rounded-3xl border border-line bg-panel p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-semibold text-ink">
            <User size={18} /> Current admin profile
          </div>

          <div className="rounded-3xl bg-white p-4 text-sm text-ink shadow-sm">
            <p className="font-semibold">Company Name</p>
            <p className="mt-1 text-muted">{config.company_name || config.company_email || 'Not set yet'}</p>
          </div>

          <div className="rounded-3xl bg-white p-4 text-sm text-ink shadow-sm">
            <p className="font-semibold">Company Email</p>
            <p className="mt-1 text-muted">{config.company_email || config.company_email || 'Not set yet'}</p>
          </div>

          <div className="rounded-3xl bg-white p-4 text-sm text-ink shadow-sm">
            <p className="font-semibold">Company Phone</p>
            <p className="mt-1 text-muted">{config.company_phone || config.company_phone || 'Not set yet'}</p>
          </div>

          <div className="rounded-3xl bg-white p-4 text-sm text-ink shadow-sm">
            <p className="font-semibold">Company Address</p>
            <p className="mt-1 text-muted">{config.company_address || config.company_address || 'Not set yet'}</p>
          </div>          

          <div className="rounded-3xl bg-white p-4 text-sm text-ink shadow-sm">
            <p className="font-semibold">Active dashboard target</p>
            <p className="mt-1 text-muted">
              {config.target_type === 'weekly'
                ? `Weekly ${formatMoney(config.target_amount)}`
                : `Monthly ${formatMoney(config.target_amount)}`}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
