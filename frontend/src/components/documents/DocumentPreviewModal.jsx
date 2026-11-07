import { Loader2, Minus, Plus, Printer, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function DocumentPreviewModal({ html, title, loading, error, onClose, onPrint }) {
  const previewRef = useRef(null)
  const pageRef = useRef(null)
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0, pageWidth: 0 })
  const [zoom, setZoom] = useState(1)
  const baseScale = previewSize.width && previewSize.pageWidth
    ? Math.min(1, previewSize.width / previewSize.pageWidth)
    : 1
  const scale = baseScale * zoom

  useEffect(() => {
    const preview = previewRef.current
    const page = pageRef.current
    if (!preview || !page) return undefined

    const updateSize = () => {
      const styles = getComputedStyle(preview)
      setPreviewSize({
        width: preview.clientWidth - Number.parseFloat(styles.paddingLeft) - Number.parseFloat(styles.paddingRight),
        height: page.offsetHeight,
        pageWidth: page.offsetWidth,
      })
    }
    const observer = new ResizeObserver(updateSize)
    observer.observe(preview)
    observer.observe(page)
    updateSize()
    return () => observer.disconnect()
  }, [html, loading, error])

  return (
    <div className="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto bg-ink/40 px-0 py-0 backdrop-blur-sm sm:px-4 sm:py-6">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col overflow-x-hidden border border-line bg-panel shadow-xl sm:min-h-0 sm:max-h-[92vh] sm:rounded-lg">
        <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-line bg-panel px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-muted">Document Preview</p>
            <h2 className="break-words text-base font-semibold text-ink">{title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {html ? (
              <>
                <div className="flex items-center gap-1 rounded-md border border-line bg-white p-1" aria-label="Document zoom controls">
                  <button type="button" onClick={() => setZoom((value) => Math.max(1, value - 0.25))} disabled={zoom <= 1} className="rounded p-1.5 text-ink hover:bg-canvas disabled:opacity-40" aria-label="Zoom out"><Minus size={16} /></button>
                  <span className="min-w-12 text-center text-xs font-medium text-muted">{Math.round(scale * 100)}%</span>
                  <button type="button" onClick={() => setZoom((value) => Math.min(2, value + 0.25))} disabled={zoom >= 2} className="rounded p-1.5 text-ink hover:bg-canvas disabled:opacity-40" aria-label="Zoom in"><Plus size={16} /></button>
                </div>
                <button type="button" onClick={onPrint} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-muted hover:bg-canvas hover:text-ink">
                  <Printer size={16} />Print
                </button>
              </>
            ) : null}
            <button type="button" onClick={onClose} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-muted hover:bg-canvas hover:text-ink">
              <X size={16} />Close
            </button>
          </div>
        </header>
        <div ref={previewRef} className="min-h-0 flex-1 overflow-auto bg-canvas p-2 sm:p-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
              <Loader2 size={16} className="animate-spin" />Loading document
            </div>
          ) : null}
          {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {html ? (
            <div className="mx-auto" style={{ width: previewSize.pageWidth ? `${previewSize.pageWidth * scale}px` : '210mm', height: `${previewSize.height * scale}px` }}>
              <div
                ref={pageRef}
                className="document-preview-content origin-top-left rounded-md bg-white shadow-sm"
                style={{ width: '210mm', transform: `scale(${scale})` }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
