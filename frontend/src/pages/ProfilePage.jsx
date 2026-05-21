import { useState } from 'react'
import { Lock, User as UserIcon } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

export function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState(() => ({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    password_confirmation: '',
  }))
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setSaved(false)
    setError('')
    setFieldErrors({})
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaved(false)
    setError('')
    setFieldErrors({})
    setBusy(true)

    try {
      const payload = {
        name: form.name,
        email: form.email,
      }

      if (form.password) {
        payload.password = form.password
        payload.password_confirmation = form.password_confirmation
      }

      await updateUser(payload)
      setSaved(true)
      setForm((current) => ({ ...current, password: '', password_confirmation: '' }))
    } catch (err) {
      const response = err?.response
      if (response?.status === 422) {
        setFieldErrors(response.data.errors || {})
      } else {
        setError(response?.data?.message || 'Unable to update profile. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand">Profile</p>
            <h1 className="mt-2 text-2xl font-semibold text-ink">Update your account details</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Keep your name, email, and password current. Changes are reflected immediately after saving.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2 text-sm text-ink">
            <UserIcon size={18} /> Account profile
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-ink">Full name</span>
              <input
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                placeholder="Your name"
              />
              {fieldErrors.name ? (
                <p className="mt-2 text-xs text-red-600">{fieldErrors.name[0]}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Email address</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                placeholder="you@example.com"
              />
              {fieldErrors.email ? (
                <p className="mt-2 text-xs text-red-600">{fieldErrors.email[0]}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">New password</span>
              <div className="relative">
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                  placeholder="Leave blank to keep current password"
                />
                <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              </div>
              {fieldErrors.password ? (
                <p className="mt-2 text-xs text-red-600">{fieldErrors.password[0]}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Confirm password</span>
              <input
                type="password"
                value={form.password_confirmation}
                onChange={(event) => updateField('password_confirmation', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                placeholder="Confirm new password"
              />
            </label>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          {saved ? (
            <div className="mt-4 rounded-2xl bg-brand/10 p-4 text-sm text-brand">
              Profile updated successfully.
            </div>
          ) : null}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-brand/50"
            >
              {busy ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </form>

        <aside className="space-y-4 rounded-3xl border border-line bg-canvas p-6 shadow-sm">
          <div className="rounded-3xl bg-white p-4 text-sm text-ink shadow-sm">
            <p className="font-semibold">Account</p>
            <p className="mt-1 text-muted">{user?.name || 'No name available'}</p>
          </div>

          <div className="rounded-3xl bg-white p-4 text-sm text-ink shadow-sm">
            <p className="font-semibold">Email</p>
            <p className="mt-1 text-muted">{user?.email || 'No email available'}</p>
          </div>

          <div className="rounded-3xl bg-white p-4 text-sm text-ink shadow-sm">
            <p className="font-semibold">Created</p>
            <p className="mt-1 text-muted">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
