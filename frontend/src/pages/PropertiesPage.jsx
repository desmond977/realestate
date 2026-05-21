import {
  Building2,
  Edit3,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { formatMoney } from '../utils/formatters'

const statusOptions = ['available', 'reserved', 'sold']

const emptyForm = {
  title: '',
  type: '',
  location: '',
  price: '',
  status: 'available',
  description: '',
  land_size: '',
  document_type: '',
  image: '',
  image_url: '',
  image_file: null,
}

function getApiError(error, fallback) {
  const errors = error.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  return error.response?.data?.message || fallback
}

function StatusBadge({ status }) {
  const styles = {
    available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    reserved: 'bg-amber-50 text-amber-700 border-amber-200',
    sold: 'bg-slate-100 text-slate-700 border-slate-200',
  }

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold capitalize ${
        styles[status] || styles.available
      }`}
    >
      {status}
    </span>
  )
}

function PropertyModal({ mode, initialValues, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState(initialValues)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({
      ...form,
      price: Number(form.price),
    })
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-line bg-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-ink">
              {mode === 'create' ? 'Add property' : 'Edit property'}
            </h3>
            <p className="text-sm text-muted">Keep inventory details current.</p>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-muted hover:bg-canvas"
            onClick={onClose}
            aria-label="Close property form"
          >
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-ink">Title</span>
              <input
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Type</span>
              <input
                value={form.type}
                onChange={(event) => updateField('type', event.target.value)}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="Land, duplex, apartment"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Location</span>
              <input
                value={form.location}
                onChange={(event) => updateField('location', event.target.value)}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Price</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => updateField('price', event.target.value)}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Status</span>
              <select
                value={form.status}
                onChange={(event) => updateField('status', event.target.value)}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm capitalize outline-none focus:border-brand"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Land size</span>
              <input
                value={form.land_size}
                onChange={(event) => updateField('land_size', event.target.value)}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="500 SQM, 1 Plot, 2 Hectares"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">Document type</span>
              <input
                value={form.document_type}
                onChange={(event) => updateField('document_type', event.target.value)}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="C of O, Allocation Letter, Survey Plan"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-ink">Property image</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  updateField('image_file', file)
                  if (file) {
                    updateField('image_url', URL.createObjectURL(file))
                  }
                }}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
              {form.image_url ? (
                <div className="mt-4 flex items-center gap-4 rounded-3xl border border-line bg-canvas p-4">
                  <img
                    src={form.image_url}
                    alt="Property preview"
                    className="h-16 w-16 rounded-xl object-cover"
                  />
                  <p className="text-sm text-muted">Preview of the selected property image.</p>
                </div>
              ) : null}
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-ink">Description</span>
            <textarea
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
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
              {mode === 'create' ? 'Create property' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function PropertiesPage() {
  const [properties, setProperties] = useState([])
  const [meta, setMeta] = useState(null)
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [query, setQuery] = useState({ search: '', status: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState(null)

  const modalInitialValues = useMemo(() => {
    if (modal?.property) {
      return {
        title: modal.property.title || '',
        type: modal.property.type || '',
        location: modal.property.location || '',
        price: modal.property.price || '',
        status: modal.property.status || 'available',
        description: modal.property.description || '',
        land_size: modal.property.land_size || '',
        document_type: modal.property.document_type || '',
        image: modal.property.image || '',
        image_url: modal.property.image_url || modal.property.image || '',
        image_file: null,
      }
    }

    return emptyForm
  }, [modal])

  const loadProperties = useCallback(async (params) => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/properties', {
        params: {
          per_page: 20,
          search: params.search || undefined,
          status: params.status || undefined,
        },
      })

      setProperties(response.data.data)
      setMeta(response.data.meta)
    } catch (err) {
      setError(getApiError(err, 'Properties could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadProperties(query)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadProperties, query])

  function applyFilters(event) {
    event.preventDefault()
    setQuery(filters)
  }

  function resetFilters() {
    const nextFilters = { search: '', status: '' }
    setFilters(nextFilters)
    setQuery(nextFilters)
  }

  async function handleSubmit(payload) {
    setSubmitting(true)
    setError('')
    setNotice('')

    try {
      const hasImageFile = payload.image_file instanceof File
      const body = new FormData()

      Object.entries(payload).forEach(([key, value]) => {
        if (key === 'image_file' || key === 'image_url') {
          return
        }

        if (key === 'image' && hasImageFile) {
          return
        }

        if (value !== undefined && value !== null && value !== '') {
          body.append(key, value)
        }
      })

      if (hasImageFile) {
        body.append('image', payload.image_file)
      }

      const config = hasImageFile ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}

      if (modal?.mode === 'edit') {
        await api.patch(`/properties/${modal.property.id}`, body, config)
        setNotice('Property updated successfully.')
      } else {
        await api.post('/properties', body, config)
        setNotice('Property created successfully.')
      }

      setModal(null)
      await loadProperties(query)
    } catch (err) {
      setError(getApiError(err, 'Property could not be saved.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteProperty(property) {
    const confirmed = window.confirm(`Delete ${property.title}?`)

    if (!confirmed) {
      return
    }

    setError('')
    setNotice('')

    try {
      await api.delete(`/properties/${property.id}`)
      setNotice('Property deleted successfully.')
      await loadProperties(query)
    } catch (err) {
      setError(getApiError(err, 'Property could not be deleted.'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-brand">Properties</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            Property inventory
          </h2>
          <p className="mt-2 text-sm text-muted">
            Manage availability, pricing, and location details for company
            assets.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ mode: 'create' })}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Plus size={17} />
          Add property
        </button>
      </div>

      <form
        className="grid gap-3 rounded-lg border border-line bg-panel p-4 shadow-sm md:grid-cols-[1fr_180px_auto_auto]"
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
            placeholder="Search title, type, or location"
          />
        </label>

        <select
          value={filters.status}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              status: event.target.value,
            }))
          }
          className="rounded-md border border-line bg-white px-3 py-2.5 text-sm capitalize outline-none focus:border-brand"
        >
          <option value="">All statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-md border border-brand bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Filter
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
            <Building2 size={18} className="text-brand" />
            <h3 className="text-base font-semibold text-ink">Properties</h3>
          </div>
          <span className="text-sm text-muted">
            {meta?.total ?? properties.length} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-canvas text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Property</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Land size</th>
                <th className="px-4 py-3 font-semibold">Document</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr key={property.id} className="border-t border-line">
                  <td className="max-w-[280px] px-4 py-3">
                    <div className="flex items-start gap-3">
                      {property.image_url ? (
                        <img
                          src={property.image_url}
                          alt={property.title}
                          className="h-14 w-20 rounded-xl object-cover"
                        />
                      ) : null}
                      <div>
                        <p className="font-medium text-ink">{property.title}</p>
                        <p className="mt-1 truncate text-xs text-muted">
                          {property.description || 'No description'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted">
                    {property.type}
                  </td>
                  <td className="px-4 py-3 text-muted">{property.location}</td>
                  <td className="px-4 py-3 text-muted">{property.land_size || '-'}</td>
                  <td className="px-4 py-3 text-muted">{property.document_type || '-'}</td>
                  <td className="px-4 py-3 font-semibold text-ink">
                    {formatMoney(property.price)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={property.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setModal({ mode: 'edit', property })}
                        className="rounded-md border border-line p-2 text-muted hover:bg-canvas hover:text-ink"
                        aria-label={`Edit ${property.title}`}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProperty(property)}
                        className="rounded-md border border-line p-2 text-red-600 hover:bg-red-50"
                        aria-label={`Delete ${property.title}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && properties.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-muted" colSpan="6">
                    No properties found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 border-t border-line px-4 py-6 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" />
            Loading properties
          </div>
        ) : null}
      </section>

      {modal ? (
        <PropertyModal
          key={`${modal.mode}-${modal.property?.id || 'new'}`}
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
