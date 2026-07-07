import { Download, Edit3, Eye, FileText, Loader2, Printer, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/client'

const DOCUMENTS_PER_PAGE = 15

function getApiError(error, fallback) {
  const errors = error.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  return error.response?.data?.message || fallback
}

function allocationCustomer(allocation) {
  return allocation?.client?.full_name || allocation?.client_name || 'Customer'
}

function allocationProperty(allocation) {
  return allocation?.property?.title || allocation?.property_name || 'Property'
}

function generatedAt(document) {
  return document?.generated_at ? new Date(document.generated_at).toLocaleString() : 'Not generated'
}

function downloadBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(url)
}

function printHtml(html) {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer')

  if (!printWindow) {
    return
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

function DocumentPreviewModal({ html, title, loading, error, onClose, onPrint }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-6">
      <section className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted">Document Preview</p>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {html ? (
              <button
                type="button"
                onClick={onPrint}
                className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium text-muted hover:bg-canvas hover:text-ink"
              >
                <Printer size={16} />
                Print
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-line px-3 py-2 text-sm font-medium text-muted hover:bg-canvas hover:text-ink"
            >
              Close
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-auto bg-canvas p-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
              <Loader2 size={16} className="animate-spin" />
              Loading document
            </div>
          ) : null}
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {html ? (
            <div
              className="mx-auto max-w-[850px] overflow-hidden rounded-md border border-line bg-white shadow-sm"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : null}
        </div>
      </section>
    </div>
  )
}

function TemplateEditModal({
  template,
  form,
  busy,
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 px-4 py-6">
      <section className="mx-auto w-full max-w-2xl rounded-lg border border-line bg-panel shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted">Edit template</p>
            <h2 className="text-base font-semibold text-ink">{template.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted hover:bg-canvas" aria-label="Close template editor">
            <X size={18} />
          </button>
        </header>
        <form onSubmit={onSubmit} className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-muted">Template name</span>
              <input
                value={form.name}
                onChange={(event) => onChange('name', event.target.value)}
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted">Slug</span>
              <input
                value={form.slug}
                onChange={(event) => onChange('slug', event.target.value)}
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                required
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-muted">Blade view path</span>
              <input
                value={form.view_path}
                onChange={(event) => onChange('view_path', event.target.value)}
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted">Active</span>
              <select
                value={form.is_active ? 'true' : 'false'}
                onChange={(event) => onChange('is_active', event.target.value === 'true')}
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-muted">Description</span>
            <textarea
              value={form.description}
              onChange={(event) => onChange('description', event.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
              rows={3}
            />
          </label>
          <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-md border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-canvas">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              Save changes
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export function DocumentsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [rows, setRows] = useState([])
  const [availableTemplates, setAvailableTemplates] = useState([])
  const [allTemplates, setAllTemplates] = useState([])
  const [meta, setMeta] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [page, setPage] = useState(1)
  const [templateName, setTemplateName] = useState('')
  const [templateSlug, setTemplateSlug] = useState('')
  const [templateViewPath, setTemplateViewPath] = useState('documents.templates.offer')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateActive, setTemplateActive] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [editTemplateForm, setEditTemplateForm] = useState({
    name: '',
    slug: '',
    view_path: '',
    description: '',
    is_active: true,
  })
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [preview, setPreview] = useState({ open: false, title: '', html: '', loading: false, error: '' })

  const documentParams = useCallback(() => ({
    per_page: DOCUMENTS_PER_PAGE,
    page,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(selectedTemplateId ? { template_id: selectedTemplateId } : {}),
  }), [page, search, selectedTemplateId])

  const reloadDocuments = useCallback(async ({ showLoader = false } = {}) => {
    if (showLoader) {
      setLoading(true)
    }

    try {
      const response = await api.get('/documents', { params: documentParams() })
      setRows(response.data.data.documents || [])
      setAvailableTemplates(response.data.data.templates || [])
      setMeta(response.data.meta)
    } catch (err) {
      setError(getApiError(err, 'Documents could not be loaded.'))
    } finally {
      if (showLoader) {
        setLoading(false)
      }
    }
  }, [documentParams])

  const reloadTemplates = useCallback(async () => {
    if (!isAdmin) {
      return
    }

    try {
      const response = await api.get('/document-templates', { params: { per_page: 50 } })
      setAllTemplates(response.data.data.templates || [])
    } catch (err) {
      setError(getApiError(err, 'Templates could not be loaded.'))
    }
  }, [isAdmin])

  useEffect(() => {
    reloadTemplates()
  }, [reloadTemplates])

  useEffect(() => {
    const delay = search.trim() ? 300 : 0
    const timeout = window.setTimeout(() => {
      reloadDocuments({ showLoader: true })
    }, delay)

    return () => window.clearTimeout(timeout)
  }, [reloadDocuments, search])

  const reloadAll = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([reloadDocuments(), reloadTemplates()])
    } catch (err) {
      setError(getApiError(err, 'Documents could not be refreshed.'))
    } finally {
      setLoading(false)
    }
  }, [reloadDocuments, reloadTemplates])

  const filteredRows = rows

  async function updateEnabled(row, template, enabled) {
    const key = `${row.allocation.id}-${template.id}-toggle`
    setBusyKey(key)
    setNotice('')
    setError('')

    try {
      await api.patch(`/allocations/${row.allocation.id}/documents`, {
        documents: {
          [template.id]: enabled,
        },
      })
      await reloadDocuments()
      setNotice(enabled ? 'Document enabled for allocation.' : 'Document disabled for allocation.')
    } catch (err) {
      setError(getApiError(err, 'Document setting could not be saved.'))
    } finally {
      setBusyKey('')
    }
  }

  async function generateDocument(row, template) {
    const key = `${row.allocation.id}-${template.id}-generate`
    setBusyKey(key)
    setNotice('')
    setError('')

    try {
      await api.post(`/allocations/${row.allocation.id}/documents/${template.id}/generate`)
      await reloadDocuments()
      setNotice(`${template.name} generated successfully.`)
    } catch (err) {
      setError(getApiError(err, 'Document could not be generated.'))
    } finally {
      setBusyKey('')
    }
  }

  async function viewDocument(row, template, printAfterLoad = false) {
    setPreview({ open: true, title: template.name, html: '', loading: true, error: '' })

    try {
      const response = await api.get(`/allocations/${row.allocation.id}/documents/${template.id}/view`, {
        responseType: 'text',
      })
      setPreview({ open: true, title: template.name, html: response.data, loading: false, error: '' })

      if (printAfterLoad) {
        printHtml(response.data)
      }
    } catch (err) {
      setPreview({
        open: true,
        title: template.name,
        html: '',
        loading: false,
        error: getApiError(err, 'Document could not be opened.'),
      })
    }
  }

  async function downloadDocument(row, template) {
    const key = `${row.allocation.id}-${template.id}-download`
    setBusyKey(key)
    setError('')

    try {
      const response = await api.get(`/allocations/${row.allocation.id}/documents/${template.id}/download`, {
        responseType: 'blob',
      })
      const disposition = response.headers['content-disposition'] || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      downloadBlob(response.data, match?.[1] || `${template.slug || 'document'}.pdf`)
    } catch (err) {
      setError(getApiError(err, 'Document could not be downloaded.'))
    } finally {
      setBusyKey('')
    }
  }

  async function createTemplate(event) {
    event.preventDefault()
    setBusyKey('template-create')
    setError('')
    setNotice('')

    try {
      await api.post('/document-templates', {
        name: templateName,
        slug: templateSlug,
        view_path: templateViewPath,
        description: templateDescription,
        is_active: templateActive,
      })

      setTemplateName('')
      setTemplateSlug('')
      setTemplateViewPath('documents.templates.offer')
      setTemplateDescription('')
      setTemplateActive(true)
      setNotice('Template created successfully.')
      await reloadDocuments()
      await reloadTemplates()
    } catch (err) {
      setError(getApiError(err, 'Template could not be created.'))
    } finally {
      setBusyKey('')
    }
  }

  async function toggleTemplateActive(template, isActive) {
    setBusyKey(`template-${template.id}-toggle`)
    setError('')
    setNotice('')

    try {
      await api.patch(`/document-templates/${template.id}`, {
        is_active: isActive,
      })
      await reloadDocuments()
      await reloadTemplates()
      setNotice(`Template ${isActive ? 'activated' : 'deactivated'} successfully.`)
    } catch (err) {
      setError(getApiError(err, 'Template could not be updated.'))
    } finally {
      setBusyKey('')
    }
  }

  function openTemplateEditor(template) {
    setEditingTemplate(template)
    setEditTemplateForm({
      name: template.name || '',
      slug: template.slug || '',
      view_path: template.view_path || '',
      description: template.description || '',
      is_active: Boolean(template.is_active),
    })
  }

  async function updateTemplate(event) {
    event.preventDefault()

    if (!editingTemplate) {
      return
    }

    setBusyKey(`template-${editingTemplate.id}-edit`)
    setError('')
    setNotice('')

    try {
      await api.patch(`/document-templates/${editingTemplate.id}`, editTemplateForm)
      setEditingTemplate(null)
      await reloadDocuments()
      await reloadTemplates()
      setNotice('Template updated successfully.')
    } catch (err) {
      setError(getApiError(err, 'Template could not be updated.'))
    } finally {
      setBusyKey('')
    }
  }

  async function deleteTemplate(template) {
    const confirmed = window.confirm(
      `Delete "${template.name}"? Generated document history will be kept.`,
    )

    if (!confirmed) {
      return
    }

    setBusyKey(`template-${template.id}-delete`)
    setError('')
    setNotice('')

    try {
      await api.delete(`/document-templates/${template.id}`)
      await reloadDocuments()
      await reloadTemplates()
      setNotice('Template deleted successfully. Generated document history was kept.')
    } catch (err) {
      setError(getApiError(err, 'Template could not be deleted.'))
    } finally {
      setBusyKey('')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-brand">Documents</p>
          <h1 className="mt-1 text-xl font-semibold text-ink md:text-2xl">Allocation documents</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted sm:text-base">
            Enable a template for an allocation, then generate, preview, or download the resulting document.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-line bg-panel px-3 py-2 text-xs font-semibold text-muted shadow-sm md:text-sm">
          <FileText size={16} className="text-brand" />
          {meta?.total ?? rows.length} allocations
        </span>
      </div>

      <section className={isAdmin ? 'grid gap-5 xl:grid-cols-[0.9fr_1.5fr]' : 'grid gap-5 xl:grid-cols-[1fr]'}>
        {isAdmin ? (
          <div className="rounded-3xl border border-line bg-panel p-4 shadow-sm md:p-5 xl:max-w-[420px]">
            <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">Template management</h2>
                <p className="mt-1 text-sm text-muted">Create or activate document templates for allocations.</p>
              </div>
            </div>

            {allTemplates.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-dashed border-line bg-white p-4 text-sm text-muted">
                No document templates exist yet. Create one below to enable document actions.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {allTemplates.map((template) => (
                  <div key={template.id} className="rounded-lg border border-line bg-white p-4 shadow-sm sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{template.name}</p>
                        <p className="mt-1 text-xs text-muted">{template.description || template.slug}</p>
                        <p className="mt-1 truncate text-xs text-muted">{template.view_path}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleTemplateActive(template, !template.is_active)}
                          disabled={busyKey === `template-${template.id}-toggle`}
                          className={`inline-flex h-9 items-center rounded-md border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            template.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-brand/20 bg-white text-brand hover:bg-brand/5'
                          }`}
                        >
                          {template.is_active ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openTemplateEditor(template)}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-line px-3 text-muted hover:bg-canvas hover:text-ink"
                          aria-label={`Edit ${template.name}`}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTemplate(template)}
                          disabled={busyKey === `template-${template.id}-delete`}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 px-3 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Delete ${template.name}`}
                        >
                          {busyKey === `template-${template.id}-delete` ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={createTemplate} className="mt-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-muted">Template name</span>
                  <input
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                    placeholder="Offer Letter"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted">Slug</span>
                  <input
                    value={templateSlug}
                    onChange={(event) => setTemplateSlug(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                    placeholder="offer-letter"
                    required
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-muted">Blade view path</span>
                  <input
                    value={templateViewPath}
                    onChange={(event) => setTemplateViewPath(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                    placeholder="documents.templates.offer"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted">Active</span>
                  <select
                    value={templateActive ? 'true' : 'false'}
                    onChange={(event) => setTemplateActive(event.target.value === 'true')}
                    className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-muted">Description</span>
                <textarea
                  value={templateDescription}
                  onChange={(event) => setTemplateDescription(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                  rows={3}
                  placeholder="A short description for this template"
                />
              </label>
              <button
                type="submit"
                disabled={busyKey === 'template-create'}
                className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
              >
                {busyKey === 'template-create' ? <Loader2 size={16} className="animate-spin" /> : 'Create template'}
              </button>
            </form>
          </div>
        ) : null}

        <div>
          <div className="grid gap-3 rounded-3xl border border-line bg-panel p-4 shadow-sm md:grid-cols-[1.6fr_1fr_auto] md:p-5 lg:items-center">
            <label className="relative block">
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                className="h-11 w-full rounded-2xl border border-line bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-brand"
                placeholder="Search customer, allocation, or property"
              />
            </label>
            <label className="block">
              <span className="sr-only">Filter by template</span>
              <select
                value={selectedTemplateId}
                onChange={(event) => {
                  setSelectedTemplateId(event.target.value)
                  setPage(1)
                }}
                className="h-11 w-full rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-brand"
              >
                <option value="">All templates</option>
                {availableTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={reloadAll}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-line px-4 text-sm font-medium text-muted hover:bg-canvas hover:text-ink"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {notice ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <section className="overflow-hidden rounded-3xl border border-line bg-panel shadow-sm mt-4">
            <div className="border-b border-line bg-white px-4 py-4 sm:px-5 sm:py-5">
              <h2 className="text-base font-semibold text-ink">Document templates by allocation</h2>
              <p className="mt-1 text-sm text-muted">Enable a template here before generating it for the customer.</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted">
                <Loader2 size={16} className="animate-spin" />
                Loading documents
              </div>
            ) : null}

            {!loading && filteredRows.length === 0 ? (
              <div className="px-4 py-10 text-center text-muted">
                {selectedTemplateId ? 'No allocations found for the selected template.' : 'No allocations found.'}
              </div>
            ) : null}

            <div className="divide-y divide-line">
              {filteredRows.map((row) => (
                <article key={row.allocation.id} className="bg-white p-4 sm:p-5">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                    <div>
                      <p className="text-xs font-medium uppercase text-muted">Allocation #{row.allocation.id}</p>
                      <h3 className="mt-1 text-base font-semibold text-ink md:text-lg">{allocationCustomer(row.allocation)}</h3>
                      <p className="mt-1 text-sm text-muted">
                        {allocationProperty(row.allocation)} / {row.allocation?.property?.location || 'No location'}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-line bg-canvas px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted md:text-xs">
                      {row.allocation.status || 'active'}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {(row.templates || []).map((item) => {
                      const template = item.template
                      const isBusy = busyKey.startsWith(`${row.allocation.id}-${template.id}`)
                      const historyCount = item.history?.length || 0

                      return (
                        <div key={template.id} className="rounded-3xl border border-line bg-canvas p-4 shadow-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink">{template.name}</p>
                              <p className="mt-1 text-xs text-muted">
                                {item.latest_document ? generatedAt(item.latest_document) : 'Not generated'} · {historyCount} history
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => updateEnabled(row, template, !item.enabled)}
                              className={`inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                item.enabled
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'border-brand/20 bg-white text-brand hover:bg-brand/5'
                              }`}
                              aria-pressed={Boolean(item.enabled)}
                              aria-label={`${item.enabled ? 'Disable' : 'Enable'} ${template.name}`}
                            >
                              {item.enabled ? 'Enabled' : 'Enable'}
                            </button>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={!item.enabled || isBusy}
                              onClick={() => generateDocument(row, template)}
                              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-brand bg-brand px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isBusy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                              {item.latest_document ? 'Regen' : 'Gen'}
                            </button>
                            <button
                              type="button"
                              disabled={!item.enabled}
                              onClick={() => viewDocument(row, template)}
                              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-line bg-white px-3 text-xs font-medium text-muted hover:bg-panel hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Eye size={14} />
                              View
                            </button>
                            <button
                              type="button"
                              disabled={!item.enabled}
                              onClick={() => viewDocument(row, template, true)}
                              className="inline-flex h-10 items-center justify-center rounded-2xl border border-line bg-white px-3 text-muted hover:bg-panel hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Print ${template.name}`}
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={!item.enabled || isBusy}
                              onClick={() => downloadDocument(row, template)}
                              className="inline-flex h-10 items-center justify-center rounded-2xl border border-line bg-white px-3 text-muted hover:bg-panel hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Download ${template.name}`}
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </article>
              ))}
            </div>

            {meta && meta.last_page > 1 ? (
              <div className="flex flex-col gap-3 border-t border-line bg-white px-4 py-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Page {meta.current_page} of {meta.last_page}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={loading || meta.current_page <= 1}
                    className="rounded-md border border-line px-3 py-2 font-medium hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(meta.last_page, current + 1))}
                    disabled={loading || meta.current_page >= meta.last_page}
                    className="rounded-md border border-line px-3 py-2 font-medium hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </section>

      {preview.open ? (
        <DocumentPreviewModal
          title={preview.title}
          html={preview.html}
          loading={preview.loading}
          error={preview.error}
          onPrint={() => printHtml(preview.html)}
          onClose={() => setPreview({ open: false, title: '', html: '', loading: false, error: '' })}
        />
      ) : null}

      {editingTemplate ? (
        <TemplateEditModal
          template={editingTemplate}
          form={editTemplateForm}
          busy={busyKey === `template-${editingTemplate.id}-edit`}
          onChange={(field, value) => setEditTemplateForm((current) => ({ ...current, [field]: value }))}
          onClose={() => setEditingTemplate(null)}
          onSubmit={updateTemplate}
        />
      ) : null}
    </div>
  )
}
