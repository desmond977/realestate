import { Eye, FileText, Loader2, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { documentsApi } from '../../services/clientApi'

function getApiError(error, fallback) {
  const errors = error.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  return error.response?.data?.message || fallback
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

function PreviewModal({ html, title, loading, error, onClose, onPrint }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-6">
      <section className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-line bg-white shadow-xl">
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

export function ClientDocumentsPage() {
  const [allocations, setAllocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState({ open: false, title: '', html: '', loading: false, error: '' })

  useEffect(() => {
    let active = true

    documentsApi
      .list()
      .then((response) => active && setAllocations(response.data.documents || []))
      .catch((err) => active && setError(getApiError(err, 'Documents could not be loaded.')))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [])

  async function viewDocument(allocation, template, printAfterLoad = false) {
    setPreview({ open: true, title: template.name, html: '', loading: true, error: '' })

    try {
      const response = await documentsApi.view(allocation.id, template.id)
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

  const totalDocuments = allocations.reduce((total, item) => total + (item.documents?.length || 0), 0)

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand">Documents</p>
          <h1 className="mt-1 text-xl font-semibold text-ink md:text-2xl">My allocation documents</h1>
          <p className="mt-1 hidden max-w-2xl text-sm text-muted sm:block">
            View and print documents enabled for your allocations.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-muted shadow-sm md:text-sm">
          <FileText size={16} className="text-brand" />
          {totalDocuments} documents
        </span>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line px-3 py-2.5 md:px-4 md:py-3">
          <h2 className="text-base font-semibold text-ink">Enabled documents</h2>
          <p className="hidden text-xs text-muted sm:block">Only documents enabled by an administrator are shown here.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" />
            Loading documents
          </div>
        ) : null}

        {!loading && totalDocuments === 0 ? (
          <div className="px-4 py-10 text-center text-muted">No documents are available yet.</div>
        ) : null}

        <div className="divide-y divide-line">
          {allocations.map((item) => (
            <article key={item.allocation.id} className="p-3 md:p-4">
              <div>
                <p className="text-xs font-medium uppercase text-muted">Allocation #{item.allocation.id}</p>
                <h3 className="mt-0.5 truncate text-base font-semibold text-ink md:text-lg">
                  {item.allocation?.property?.title || 'Property'}
                </h3>
                <p className="mt-0.5 truncate text-xs text-muted md:text-sm">
                  {item.allocation?.property?.location || 'No location'}
                </p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-2">
                {(item.documents || []).map((documentItem) => {
                  const template = documentItem.template

                  return (
                    <div key={template.id} className="rounded-lg border border-line bg-canvas p-2.5 md:p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{template.name}</p>
                        <p className="mt-1 truncate text-[11px] text-muted md:text-xs">
                          {documentItem.latest_document?.generated_at ? new Date(documentItem.latest_document.generated_at).toLocaleString() : 'Pending generation'}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          disabled={!documentItem.latest_document}
                          onClick={() => viewDocument(item.allocation, template)}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-brand/20 bg-brand/5 px-2 text-xs font-semibold text-brand disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Eye size={14} />
                          View
                        </button>
                        <button
                          type="button"
                          disabled={!documentItem.latest_document}
                          onClick={() => viewDocument(item.allocation, template, true)}
                          className="grid h-8 w-8 place-items-center rounded-md border border-line bg-white text-muted hover:bg-panel hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Print ${template.name}`}
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      {preview.open ? (
        <PreviewModal
          title={preview.title}
          html={preview.html}
          loading={preview.loading}
          error={preview.error}
          onPrint={() => printHtml(preview.html)}
          onClose={() => setPreview({ open: false, title: '', html: '', loading: false, error: '' })}
        />
      ) : null}
    </div>
  )
}
