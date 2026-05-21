import { CalendarDays, ListChecks, Plus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'

function buildStorageKey(userId) {
  return `estateops_realtors_${userId}`
}

function getCurrentMonthLabel() {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

function createEntry(values) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: values.type,
    name: values.name,
    email: values.email,
    phone: values.phone,
    note: values.note,
    created_at: new Date().toISOString(),
  }
}

const initialForm = {
  type: 'Referral',
  name: '',
  email: '',
  phone: '',
  note: '',
}

export function RealtorsPage() {
  const { user } = useAuth()
  const storageKey = buildStorageKey(user?.id || 'anonymous')
  const [entries, setEntries] = useState(() => {
    const stored = localStorage.getItem(storageKey)

    if (!stored) {
      return []
    }

    try {
      return JSON.parse(stored)
    } catch {
      localStorage.removeItem(storageKey)
      return []
    }
  })
  const [form, setForm] = useState(initialForm)
  const [saved, setSaved] = useState(false)

  const currentMonth = useMemo(() => getCurrentMonthLabel(), [])

  const currentMonthEntries = useMemo(() => {
    const now = new Date()
    return entries.filter((entry) => {
      const entryDate = new Date(entry.created_at)
      return (
        entryDate.getFullYear() === now.getFullYear() &&
        entryDate.getMonth() === now.getMonth()
      )
    })
  }, [entries])

  const typeCounts = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        const key = entry.type === 'Client' ? 'clients' : 'referrals'
        acc[key] += 1
        return acc
      },
      { clients: 0, referrals: 0 },
    )
  }, [entries])

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setSaved(false)
  }

  function saveEntries(nextEntries) {
    localStorage.setItem(storageKey, JSON.stringify(nextEntries))
    setEntries(nextEntries)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (!form.name.trim()) {
      return
    }

    const next = [createEntry(form), ...entries]
    saveEntries(next)
    setForm(initialForm)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand">Realtors</p>
            <h1 className="mt-2 text-2xl font-semibold text-ink">
              Realtor clients & referrals
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Add new leads, and track your logged-in realtor’s referral activity for {currentMonth}.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2 text-sm text-ink">
            <CalendarDays size={18} /> {currentMonth}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-brand">Lead capture</p>
                <h2 className="mt-2 text-xl font-semibold text-ink">Add a new client or referral</h2>
                <p className="mt-1 text-sm text-muted">
                  Submit someone you’re working with so they appear in your current month summary.
                </p>
              </div>
              <div className="rounded-full bg-brand/10 px-4 py-2 text-sm font-semibold text-brand">
                {entries.length} total leads
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-ink">Type</span>
                  <select
                    value={form.type}
                    onChange={(event) => updateForm('type', event.target.value)}
                    className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                  >
                    <option>Referral</option>
                    <option>Client</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-ink">Name</span>
                  <input
                    value={form.name}
                    onChange={(event) => updateForm('name', event.target.value)}
                    className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                    placeholder="Enter client or referral name"
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-ink">Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateForm('email', event.target.value)}
                    className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                    placeholder="contact@example.com"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-ink">Phone</span>
                  <input
                    value={form.phone}
                    onChange={(event) => updateForm('phone', event.target.value)}
                    className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                    placeholder="0803 000 0000"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-ink">Note</span>
                <textarea
                  value={form.note}
                  onChange={(event) => updateForm('note', event.target.value)}
                  rows="4"
                  className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand"
                  placeholder="Brief note about the lead or referral source"
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <div className="text-sm text-muted">
                  {saved ? 'Saved to your realtor log.' : 'New leads are stored locally in your browser.'}
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
                >
                  <Plus size={16} /> Add lead
                </button>
              </div>
            </form>
          </div>

          {currentMonthEntries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line bg-panel p-6 text-center text-sm text-muted shadow-sm">
              <p className="font-semibold text-ink">No clients or referrals yet this month.</p>
              <p className="mt-2">Start building your realtor pipeline by adding your first lead.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentMonthEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-3xl border border-line bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-ink">{entry.name}</p>
                      <p className="mt-1 text-xs text-muted">{entry.type}</p>
                    </div>
                    <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-canvas p-3 text-sm text-ink">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Email</p>
                      <p className="mt-2 break-words">{entry.email || 'No email'}</p>
                    </div>
                    <div className="rounded-2xl bg-canvas p-3 text-sm text-ink">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Phone</p>
                      <p className="mt-2">{entry.phone || 'No phone'}</p>
                    </div>
                  </div>
                  {entry.note ? (
                    <p className="mt-4 text-sm text-muted">{entry.note}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4 rounded-3xl border border-line bg-panel p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-semibold text-ink">
            <Users size={18} /> Realtor summary
          </div>
          <div className="rounded-3xl bg-white p-4 text-sm text-ink shadow-sm">
            <p className="font-semibold">Realtor</p>
            <p className="mt-1 text-muted">{user?.name || 'Unknown realtor'}</p>
          </div>
          <div className="grid gap-3">
            <div className="rounded-3xl bg-white p-4 text-sm shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Clients</p>
              <p className="mt-2 text-xl font-semibold text-ink">{typeCounts.clients}</p>
            </div>
            <div className="rounded-3xl bg-white p-4 text-sm shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Referrals</p>
              <p className="mt-2 text-xl font-semibold text-ink">{typeCounts.referrals}</p>
            </div>
            <div className="rounded-3xl bg-white p-4 text-sm shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-muted">Current month</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-1 text-xs font-semibold text-brand">
                  <CalendarDays size={14} /> {currentMonth}
                </span>
              </div>
              <p className="mt-2 text-xl font-semibold text-ink">{currentMonthEntries.length}</p>
            </div>
          </div>
          <div className="rounded-3xl border border-line bg-canvas p-4 text-sm text-muted">
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              <ListChecks size={16} /> What to do next
            </div>
            <ul className="mt-3 space-y-2 list-disc pl-5">
              <li>Capture client details quickly.</li>
              <li>Submit referrals to grow your network.</li>
              <li>Keep current month leads updated.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
