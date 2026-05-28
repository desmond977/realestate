import {
  Building2,
  Edit3,
  FileText,
  Image as ImageIcon,
  Layers3,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, assetUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { canManageProperties } from '../auth/permissions'
import { formatMoney } from '../utils/formatters'

const statusOptions = ['available', 'reserved', 'sold']

const emptyForm = {
  title: '',
  type: '',
  location: '',
  price: '',
  property_count: 1,
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

function PropertyImage({ property, className = 'h-14 w-20 rounded-md' }) {
  const imageUrl = assetUrl(property.image_url || property.image)

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={property.title}
        className={`${className} shrink-0 object-cover`}
      />
    )
  }

  return (
    <div className={`${className} grid shrink-0 place-items-center border border-line bg-canvas text-muted`}>
      <ImageIcon className="h-5 w-5" />
    </div>
  )
}

function InventorySummary({ property, compact = false }) {
  return (
    <div className={compact ? 'w-full space-y-2' : 'space-y-1'}>
      <div className="inline-flex items-center gap-1.5 rounded-md border border-line bg-canvas px-2 py-1 text-xs font-semibold text-ink">
        <Layers3 size={13} />
        {property.property_count || 0} plots
      </div>
      <div className="flex max-w-full flex-wrap gap-1.5 text-[11px] font-medium">
        <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
          {property.available_count ?? 0} available
        </span>
        <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">
          {property.reserved_count ?? 0} reserved
        </span>
        <span className="rounded-md bg-red-50 px-2 py-1 text-red-700">
          {property.sold_count ?? 0} sold
        </span>
      </div>
    </div>
  )
}

function PropertyModal({ mode, initialValues, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState(initialValues)
  const [previewUrl, setPreviewUrl] = useState(assetUrl(initialValues.image_url || initialValues.image))

  useEffect(() => {
    setForm(initialValues)
    setPreviewUrl(assetUrl(initialValues.image_url || initialValues.image))
  }, [initialValues])

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    onSubmit({
      ...form,
      price: Number(form.price),
      property_count: Number(form.property_count),
    })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 px-0 py-0 sm:px-4 sm:py-6">
      <div className="mx-auto min-h-screen w-full max-w-3xl border border-line bg-panel shadow-xl sm:min-h-0 sm:rounded-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-panel px-4 py-4 sm:px-5">
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

        <form className="space-y-4 px-4 py-5 sm:px-5" onSubmit={handleSubmit}>
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
              <span className="text-sm font-medium text-ink">Property count</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.property_count}
                onChange={(event) => updateField('property_count', event.target.value)}
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
                    const nextPreviewUrl = URL.createObjectURL(file)
                    setPreviewUrl((currentPreviewUrl) => {
                      if (currentPreviewUrl?.startsWith('blob:')) {
                        URL.revokeObjectURL(currentPreviewUrl)
                      }

                      return nextPreviewUrl
                    })
                  }
                }}
                className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none file:mr-4 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
              {previewUrl ? (
                <div className="mt-4 flex items-center gap-4 rounded-lg border border-line bg-canvas p-3">
                  <img
                    src={previewUrl}
                    alt="Property preview"
                    className="h-16 w-16 rounded-md object-cover"
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

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="sticky bottom-0 -mx-4 -mb-5 flex flex-col-reverse gap-3 border-t border-line bg-panel px-4 py-4 sm:-mx-5 sm:flex-row sm:justify-end sm:px-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-muted hover:bg-canvas hover:text-ink"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === 'create' ? 'Create property' : 'Save property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function PropertiesPage() {
  const { user } = useAuth()
  const canManage = canManageProperties(user)
  const [properties, setProperties] = useState([])
  const [meta, setMeta] = useState(null)
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [query, setQuery] = useState({ search: '', status: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [modalError, setModalError] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState(null)

  const modalInitialValues = useMemo(() => {
    if (modal?.property) {
      return {
        title: modal.property.title || '',
        type: modal.property.type || '',
        location: modal.property.location || '',
        price: modal.property.price || '',
        property_count: modal.property.property_count || 1,
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

  const inventoryStats = useMemo(() => {
    return properties.reduce(
      (totals, property) => {
        totals.properties += 1
        totals.value += Number(property.price || 0) * Number(property.property_count || 0)
        totals.plots += property.property_count || 0
        totals.available += property.available_count || 0
        totals.reserved += property.reserved_count || 0
        totals.sold += property.sold_count || 0

        return totals
      },
      {
        properties: 0,
        plots: 0,
        available: 0,
        reserved: 0,
        sold: 0,
        value: 0,
      },
    )
  }, [properties])

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

  function upsertProperty(savedProperty) {
    setProperties((current) => {
      const exists = current.some((property) => property.id === savedProperty.id)

      if (exists) {
        return current.map((property) =>
          property.id === savedProperty.id ? savedProperty : property,
        )
      }

      return [savedProperty, ...current]
    })
  }

  async function handleSubmit(payload) {
    setSubmitting(true)
    setModalError('')
    setNotice('')

    try {
      const hasImageFile = payload.image_file instanceof File
      const body = new FormData()
      const scalarFields = [
        'title',
        'type',
        'location',
        'price',
        'property_count',
        'status',
        'description',
        'land_size',
        'document_type',
      ]

      scalarFields.forEach((field) => {
        body.append(field, payload[field] ?? '')
      })

      Object.entries(payload).forEach(([key, value]) => {
        if (scalarFields.includes(key) || key === 'image_file' || key === 'image_url') {
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

      let response

      if (modal?.mode === 'edit') {
        body.append('_method', 'PATCH')
        response = await api.post(`/properties/${modal.property.id}`, body)
        setNotice('Property updated successfully.')
      } else {
        response = await api.post('/properties', body)
        setNotice('Property created successfully.')
      }

      const savedProperty = response.data.data.property
      upsertProperty(savedProperty)

      setModal(null)
    } catch (err) {
      setModalError(getApiError(err, 'Property could not be saved.'))
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
    <div className="space-y-4 md:space-y-6">
      <div className="rounded-lg border border-line bg-panel p-4 shadow-sm md:p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-brand">Properties</p>
            <h2 className="mt-1 text-2xl font-semibold text-ink">Property inventory</h2>
            <p className="mt-2 text-sm text-muted">
              {canManage
                ? 'Manage estates, plot counts, pricing, status, and documents from one inventory view.'
                : 'Review estate inventory, pricing, availability, and allocation readiness.'}
            </p>
          </div>
          {canManage ? (
            <button
              type="button"
              onClick={() => { setModalError(''); setModal({ mode: 'create' }) }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              <Plus size={17} />
              Add property
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {[
            ['Properties', inventoryStats.properties],
            ['Total plots', inventoryStats.plots],
            ['Available', inventoryStats.available],
            ['Reserved', inventoryStats.reserved],
            ['Sold', inventoryStats.sold],
            ['Inventory value', formatMoney(inventoryStats.value)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-line bg-canvas px-3 py-3">
              <p className="text-[11px] font-semibold uppercase text-muted">{label}</p>
              <p className="mt-1 truncate text-base font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <form
        className="grid gap-3 rounded-lg border border-line bg-panel p-3 shadow-sm sm:p-4 md:grid-cols-[1fr_180px_auto_auto]"
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
          <span className="text-sm text-muted">{meta?.total ?? properties.length} total</span>
        </div>

        <div className="grid gap-3 p-3 md:hidden">
          {properties.map((property) => (
            <article key={property.id} className="w-full overflow-hidden rounded-lg border border-line bg-white p-3 shadow-sm">
              <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3">
                <PropertyImage property={property} className="h-20 w-20 rounded-md" />
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-ink">{property.title}</h3>
                  <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted">
                    <MapPin size={13} className="shrink-0" />
                    <span className="min-w-0 truncate">{property.location}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={property.status} />
                    <span className="min-w-0 max-w-full truncate rounded-md bg-canvas px-2 py-1 text-xs font-medium capitalize text-muted">
                      {property.type}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-base font-semibold text-ink">{formatMoney(property.price)}</p>
                </div>
              </div>

              <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 text-xs">
                <div className="min-w-0 rounded-md border border-line bg-canvas px-3 py-2">
                  <p className="font-medium text-muted">Land size</p>
                  <p className="mt-1 truncate font-semibold text-ink">{property.land_size || '-'}</p>
                </div>
                <div className="min-w-0 rounded-md border border-line bg-canvas px-3 py-2">
                  <p className="font-medium text-muted">Document</p>
                  <p className="mt-1 truncate font-semibold text-ink">{property.document_type || '-'}</p>
                </div>
              </div>

              <div className="mt-3">
                <InventorySummary property={property} compact />
              </div>

              {canManage ? (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
                  <button
                    type="button"
                    onClick={() => { setModalError(''); setModal({ mode: 'edit', property }) }}
                    className="inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-md border border-line px-3 text-xs font-semibold text-ink hover:bg-canvas"
                    aria-label={`Edit ${property.title}`}
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteProperty(property)}
                    className="inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
                    aria-label={`Delete ${property.title}`}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              ) : null}
            </article>
          ))}

          {!loading && properties.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm text-muted">
              No properties found.
            </div>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-canvas text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Property</th>
                <th className="px-4 py-3 font-semibold">Details</th>
                <th className="px-4 py-3 font-semibold">Inventory</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                {canManage ? (
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr key={property.id} className="border-t border-line">
                  <td className="max-w-[340px] px-4 py-3">
                    <div className="flex items-start gap-3">
                      <PropertyImage property={property} className="h-14 w-20 rounded-md" />
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{property.title}</p>
                        <p className="mt-1 truncate text-xs text-muted">
                          {property.description || 'No description'}
                        </p>
                        <p className="mt-2 inline-flex rounded-md bg-canvas px-2 py-1 text-xs font-medium capitalize text-muted">
                          {property.type}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-2 text-xs text-muted">
                      <p className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-brand" />
                        <span className="max-w-[220px] truncate">{property.location}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <FileText size={14} className="text-brand" />
                        <span className="max-w-[220px] truncate">{property.document_type || 'No document'}</span>
                      </p>
                      <p className="font-medium text-ink">{property.land_size || '-'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <InventorySummary property={property} />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-ink">{formatMoney(property.price)}</p>
                      <p className="mt-1 text-xs text-muted">
                        {formatMoney(Number(property.price || 0) * Number(property.property_count || 0))} inventory value
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={property.status} />
                  </td>
                  {canManage ? (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => { setModalError(''); setModal({ mode: 'edit', property }) }}
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
                  ) : null}
                </tr>
              ))}

              {!loading && properties.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-muted" colSpan={canManage ? 6 : 5}>
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

      {modal && canManage ? (
        <PropertyModal
          key={`${modal.mode}-${modal.property?.id || 'new'}`}
          mode={modal.mode}
          initialValues={modalInitialValues}
          onClose={() => { setModal(null); setModalError('') }}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={modalError}
        />
      ) : null}
    </div>
  )
}
