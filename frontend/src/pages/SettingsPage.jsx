import { ShieldCheck, Settings2, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { formatMoney } from '../utils/formatters'

const STORAGE_KEY = 'estateops_dashboard_settings'
const defaultConfig = {
  admin_name: '',
  admin_email: '',
  admin_phone: '',
  targetType: 'monthly',
  targetAmount: 250000,
}

export function SettingsPage() {
  const { user } = useAuth()
  const [config, setConfig] = useState(defaultConfig)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (stored) {
      try {
        setConfig(JSON.parse(stored))
        return
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }

    setConfig((current) => ({
      ...current,
      admin_name: user?.name || '',
      admin_email: user?.email || '',
    }))
  }, [user])

  function updateField(field, value) {
    setConfig((current) => ({ ...current, [field]: value }))
    setSaved(false)
  }

  function submitSettings(event) {
    event.preventDefault()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    setSaved(true)
  }

  const targetHint =
    config.targetType === 'weekly'
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
            <Settings2 size={18} /> Saved settings
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form
          onSubmit={submitSettings}
          className="rounded-3xl border border-line bg-panel p-6 shadow-sm"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-ink">Admin name</span>
              <input
                value={config.admin_name}
                onChange={(event) => updateField('admin_name', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                placeholder="Enter administrator name"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Admin email</span>
              <input
                type="email"
                value={config.admin_email}
                onChange={(event) => updateField('admin_email', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                placeholder="admin@example.com"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-ink">Admin phone</span>
              <input
                value={config.admin_phone}
                onChange={(event) => updateField('admin_phone', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                placeholder="0803 000 0000"
              />
            </label>

            <div className="space-y-3 rounded-3xl border border-line bg-canvas p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <ShieldCheck size={18} /> Admin contacts
              </div>
              <p className="text-sm text-muted">
                This information is saved locally for dashboard access and quick reference.
              </p>
            </div>
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
                    checked={config.targetType === 'monthly'}
                    onChange={() => updateField('targetType', 'monthly')}
                    className="accent-brand"
                  />
                </div>
                <input
                  type="number"
                  min="0"
                  value={config.targetAmount}
                  onChange={(event) => updateField('targetAmount', Number(event.target.value))}
                  className="mt-3 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                />
              </label>

              <label className="block rounded-2xl border border-line bg-white p-4">
                <div className="flex items-center justify-between text-sm font-medium text-ink">
                  <span>Weekly target</span>
                  <input
                    type="radio"
                    name="targetType"
                    checked={config.targetType === 'weekly'}
                    onChange={() => updateField('targetType', 'weekly')}
                    className="accent-brand"
                  />
                </div>
                <input
                  type="number"
                  min="0"
                  value={config.targetAmount}
                  onChange={(event) => updateField('targetAmount', Number(event.target.value))}
                  className="mt-3 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                />
              </label>
            </div>

            <p className="mt-4 text-sm text-muted">{targetHint}</p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            {saved ? (
              <p className="text-sm font-medium text-brand">Settings saved locally.</p>
            ) : null}
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Save settings
            </button>
          </div>
        </form>

        <aside className="space-y-4 rounded-3xl border border-line bg-panel p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-semibold text-ink">
            <User size={18} /> Current admin profile
          </div>

          <div className="rounded-3xl bg-white p-4 text-sm text-ink shadow-sm">
            <p className="font-semibold">Name</p>
            <p className="mt-1 text-muted">{config.admin_name || 'Not set yet'}</p>
          </div>

          <div className="rounded-3xl bg-white p-4 text-sm text-ink shadow-sm">
            <p className="font-semibold">Email</p>
            <p className="mt-1 text-muted">{config.admin_email || 'Not set yet'}</p>
          </div>

          <div className="rounded-3xl bg-white p-4 text-sm text-ink shadow-sm">
            <p className="font-semibold">Phone</p>
            <p className="mt-1 text-muted">{config.admin_phone || 'Not set yet'}</p>
          </div>

          <div className="rounded-3xl bg-white p-4 text-sm text-ink shadow-sm">
            <p className="font-semibold">Active dashboard target</p>
            <p className="mt-1 text-muted">
              {config.targetType === 'weekly'
                ? `Weekly ${formatMoney(config.targetAmount)}`
                : `Monthly ${formatMoney(config.targetAmount)}`}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
