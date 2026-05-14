import {
  Edit3,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  occupation: '',
}

function getApiError(error, fallback) {
  const errors = error.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  return error.response?.data?.message || fallback
}

function ClientModal({ mode, initialValues, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState(initialValues)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit(form)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-line bg-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-ink">
              {mode === 'create' ? 'Add client' : 'Edit client'}
            </h3>
            <p className="text-sm text-muted">
              Keep client contact and profile details accurate.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-muted hover:bg-canvas"
            onClick={onClose}
            aria-label="Close client form"
          >
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-ink">First name</span>
              <input
                value={form.first_name}
                onChange={(event) =>
                  updateField('first_name', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Last name</span>
              <input
                value={form.last_name}
                onChange={(event) =>
                  updateField('last_name', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="client@example.com"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Phone</span>
              <input
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="08030000000"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-ink">Occupation</span>
              <input
                value={form.occupation}
                onChange={(event) =>
                  updateField('occupation', event.target.value)
                }
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="Engineer, investor, business owner"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-ink">Address</span>
            <textarea
              value={form.address}
              onChange={(event) => updateField('address', event.target.value)}
              rows="4"
              className="mt-2 w-full resize-y rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-muted hover:bg-canvas hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === 'create' ? 'Create client' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ClientsPage() {
  const [clients, setClients] = useState([])
  const [meta, setMeta] = useState(null)
  const [filters, setFilters] = useState({ search: '' })
  const [query, setQuery] = useState({ search: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState(null)

  const modalInitialValues = useMemo(() => {
    if (modal?.client) {
      return {
        first_name: modal.client.first_name || '',
        last_name: modal.client.last_name || '',
        email: modal.client.email || '',
        phone: modal.client.phone || '',
        address: modal.client.address || '',
        occupation: modal.client.occupation || '',
      }
    }

    return emptyForm
  }, [modal])

  const loadClients = useCallback(async (params) => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/clients', {
        params: {
          per_page: 20,
          search: params.search || undefined,
        },
      })

      setClients(response.data.data)
      setMeta(response.data.meta)
    } catch (err) {
      setError(getApiError(err, 'Clients could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadClients(query)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadClients, query])

  function applyFilters(event) {
    event.preventDefault()
    setQuery(filters)
  }

  function resetFilters() {
    const nextFilters = { search: '' }
    setFilters(nextFilters)
    setQuery(nextFilters)
  }

  async function handleSubmit(payload) {
    setSubmitting(true)
    setError('')
    setNotice('')

    try {
      if (modal?.mode === 'edit') {
        await api.patch(`/clients/${modal.client.id}`, payload)
        setNotice('Client updated successfully.')
      } else {
        await api.post('/clients', payload)
        setNotice('Client created successfully.')
      }

      setModal(null)
      await loadClients(query)
    } catch (err) {
      setError(getApiError(err, 'Client could not be saved.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteClient(client) {
    const confirmed = window.confirm(`Delete ${client.full_name}?`)

    if (!confirmed) {
      return
    }

    setError('')
    setNotice('')

    try {
      await api.delete(`/clients/${client.id}`)
      setNotice('Client deleted successfully.')
      await loadClients(query)
    } catch (err) {
      setError(getApiError(err, 'Client could not be deleted.'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-brand">Clients</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            Client records
          </h2>
          <p className="mt-2 text-sm text-muted">
            Manage buyer profiles, contact details, and relationship history.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ mode: 'create' })}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Plus size={17} />
          Add client
        </button>
      </div>

      <form
        className="grid gap-3 rounded-lg border border-line bg-panel p-4 shadow-sm md:grid-cols-[1fr_auto_auto]"
        onSubmit={applyFilters}
      >
        <label className="relative block">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
            className="w-full rounded-md border border-line bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand"
            placeholder="Search name, email, or phone"
          />
        </label>

        <button
          type="submit"
          className="rounded-md border border-brand bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Search
        </button>

        <button
          type="button"
          onClick={resetFilters}
          className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-muted hover:bg-canvas hover:text-ink"
        >
          Reset
        </button>
      </form>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      <section className="rounded-lg border border-line bg-panel shadow-sm">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-brand" />
            <h3 className="text-base font-semibold text-ink">Clients</h3>
          </div>
          <span className="text-sm text-muted">
            {meta?.total ?? clients.length} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-canvas text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Occupation</th>
                <th className="px-4 py-3 font-semibold">Address</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{client.full_name}</p>
                    <p className="mt-1 text-xs text-muted">
                      ID #{client.id}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1 text-muted">
                      <p className="flex items-center gap-2">
                        <Mail size={14} />
                        {client.email || 'No email'}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone size={14} />
                        {client.phone || 'No phone'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {client.occupation || 'Not specified'}
                  </td>
                  <td className="max-w-[260px] px-4 py-3">
                    <p className="truncate text-muted">
                      {client.address || 'No address'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setModal({ mode: 'edit', client })}
                        className="rounded-md border border-line p-2 text-muted hover:bg-canvas hover:text-ink"
                        aria-label={`Edit ${client.full_name}`}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteClient(client)}
                        className="rounded-md border border-line p-2 text-red-600 hover:bg-red-50"
                        aria-label={`Delete ${client.full_name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && clients.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-muted" colSpan="5">
                    No clients found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 border-t border-line px-4 py-6 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" />
            Loading clients
          </div>
        ) : null}
      </section>

      {modal ? (
        <ClientModal
          key={`${modal.mode}-${modal.client?.id || 'new'}`}
          mode={modal.mode}
          initialValues={modalInitialValues}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      ) : null}
    </div>
  )
}
