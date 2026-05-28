import { Edit3, Loader2, Plus, Search, Trash2, Users, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

const roles = ['admin', 'staff', 'accountant']
const statuses = ['active', 'inactive']

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'staff',
  status: 'active',
}

function getApiError(error, fallback) {
  const errors = error.response?.data?.errors
  return errors ? Object.values(errors).flat().join(' ') : error.response?.data?.message || fallback
}

function Badge({ value, tone = 'slate' }) {
  const styles = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  }

  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold capitalize ${styles[tone]}`}>
      {value}
    </span>
  )
}

function UserModal({ mode, initialValues, submitting, error, onClose, onSubmit }) {
  const [form, setForm] = useState(initialValues)

  useEffect(() => setForm(initialValues), [initialValues])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({
      ...form,
      password: form.password || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 px-0 py-0 sm:px-4 sm:py-6">
      <div className="mx-auto min-h-screen w-full max-w-2xl border border-line bg-panel shadow-xl sm:min-h-0 sm:rounded-lg">
        <div className="flex items-start justify-between border-b border-line px-4 py-4 sm:px-5">
          <div>
            <p className="text-sm font-medium text-brand">User management</p>
            <h3 className="mt-1 text-lg font-semibold text-ink">{mode === 'create' ? 'Create user' : 'Edit user'}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted hover:bg-canvas" aria-label="Close user form">
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4 p-4 sm:p-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-ink">Full name</span>
              <input value={form.name} onChange={(event) => updateField('name', event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-brand" required />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Email</span>
              <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-brand" required />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Phone</span>
              <input value={form.phone || ''} onChange={(event) => updateField('phone', event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-brand" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Password</span>
              <input type="password" value={form.password || ''} onChange={(event) => updateField('password', event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-brand" required={mode === 'create'} placeholder={mode === 'edit' ? 'Leave blank to keep current password' : ''} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Role</span>
              <select value={form.role} onChange={(event) => updateField('role', event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm capitalize outline-none focus:border-brand">
                {roles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Status</span>
              <select value={form.status} onChange={(event) => updateField('status', event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm capitalize outline-none focus:border-brand">
                {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
          </div>

          {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

          <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-muted hover:bg-canvas">Cancel</button>
            <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-70">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === 'create' ? 'Create user' : 'Save user'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function UsersPage() {
  const [users, setUsers] = useState([])
  const [meta, setMeta] = useState(null)
  const [filters, setFilters] = useState({ search: '' })
  const [query, setQuery] = useState({ search: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [modalError, setModalError] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState(null)

  const initialValues = useMemo(() => {
    if (!modal?.user) return emptyForm
    return {
      name: modal.user.name || '',
      email: modal.user.email || '',
      phone: modal.user.phone || '',
      password: '',
      role: modal.user.role || 'staff',
      status: modal.user.status || 'active',
    }
  }, [modal])

  const loadUsers = useCallback(async (params) => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/users', { params: { per_page: 20, search: params.search || undefined } })
      setUsers(response.data.data)
      setMeta(response.data.meta)
    } catch (err) {
      setError(getApiError(err, 'Users could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers(query)
  }, [loadUsers, query])

  async function handleSubmit(payload) {
    setSubmitting(true)
    setModalError('')
    setNotice('')
    try {
      if (modal?.mode === 'edit') {
        await api.patch(`/users/${modal.user.id}`, payload)
        setNotice('User updated successfully.')
      } else {
        await api.post('/users', payload)
        setNotice('User created successfully.')
      }
      setModal(null)
      await loadUsers(query)
    } catch (err) {
      setModalError(getApiError(err, 'User could not be saved.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteUser(user) {
    if (!window.confirm(`Delete ${user.name}?`)) return
    setError('')
    setNotice('')
    try {
      await api.delete(`/users/${user.id}`)
      setNotice('User deleted successfully.')
      await loadUsers(query)
    } catch (err) {
      setError(getApiError(err, 'User could not be deleted.'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-brand">Admin</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">User management</h2>
          <p className="mt-2 text-sm text-muted">Create users, assign roles, and control account access.</p>
        </div>
        <button type="button" onClick={() => { setModalError(''); setModal({ mode: 'create' }) }} className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
          <Plus size={17} />
          Add user
        </button>
      </div>

      <form className="grid gap-3 rounded-lg border border-line bg-panel p-4 shadow-sm md:grid-cols-[1fr_auto]" onSubmit={(event) => { event.preventDefault(); setQuery(filters) }}>
        <label className="relative block">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={filters.search} onChange={(event) => setFilters({ search: event.target.value })} className="w-full rounded-md border border-line bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand" placeholder="Search name, email, or phone" />
        </label>
        <button type="submit" className="rounded-md border border-brand bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">Search</button>
      </form>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {notice ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}

      <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-sm">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-brand" />
            <h3 className="text-base font-semibold text-ink">Users</h3>
          </div>
          <span className="text-sm text-muted">{meta?.total ?? users.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-canvas text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{user.name}</p>
                    <p className="mt-1 text-xs text-muted">{user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">{user.phone || '-'}</td>
                  <td className="px-4 py-3"><Badge value={user.role} tone="slate" /></td>
                  <td className="px-4 py-3"><Badge value={user.status} tone={user.status === 'active' ? 'green' : 'amber'} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => { setModalError(''); setModal({ mode: 'edit', user }) }} className="rounded-md border border-line p-2 text-muted hover:bg-canvas" aria-label={`Edit ${user.name}`}><Edit3 size={16} /></button>
                      <button type="button" onClick={() => deleteUser(user)} className="rounded-md border border-line p-2 text-red-600 hover:bg-red-50" aria-label={`Delete ${user.name}`}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 ? (
                <tr><td className="px-4 py-10 text-center text-muted" colSpan="5">No users found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {loading ? <div className="flex items-center justify-center gap-2 border-t border-line px-4 py-6 text-sm text-muted"><Loader2 size={16} className="animate-spin" />Loading users</div> : null}
      </section>

      {modal ? (
        <UserModal
          mode={modal.mode}
          initialValues={initialValues}
          submitting={submitting}
          error={modalError}
          onClose={() => { setModal(null); setModalError('') }}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  )
}
