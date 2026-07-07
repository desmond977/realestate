import { Download, Loader2, Printer, ReceiptText, X } from 'lucide-react'
import { assetUrl } from '../../api/client'
import { formatMoney } from '../../utils/formatters'

function formatDate(value, withTime = false) {
  if (!value) return '-'

  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildReceiptHtml(receiptDocument) {
  const summary = receiptDocument?.installment_summary || {}
  const payment = receiptDocument?.payment || {}
  const company = receiptDocument?.company || {}
  const client = receiptDocument?.client || {}
  const realtor = receiptDocument?.realtor || {}
  const property = receiptDocument?.property || {}
  const allocation = receiptDocument?.allocation || {}
  const history = receiptDocument?.payment_history || []
  const notes = receiptDocument?.notes || []
  const balance = Number(summary.remaining_balance || 0)
  const progress = Number(summary.progress_percentage || 0)

  const historyRows = history.map((item) => `
    <tr>
      <td>${escapeHtml(formatDate(item.date, true))}</td>
      <td>${escapeHtml(formatMoney(item.amount))}</td>
      <td>${escapeHtml(item.method || '-')}</td>
      <td>${escapeHtml(String(item.status || '').replaceAll('_', ' '))}</td>
    </tr>
  `).join('')

  const logo = company.logo
    ? `<img src="${escapeHtml(assetUrl(company.logo))}" alt="${escapeHtml(company.name || 'Logo')}" style="height:54px;width:54px;object-fit:contain;border-radius:8px;margin-bottom:12px;" />`
    : `<div style="display:inline-block;height:48px;width:48px;border-radius:8px;background:#234832;color:#ffffff;font-size:20px;font-weight:700;line-height:48px;text-align:center;margin-bottom:12px;">${escapeHtml((company.name || 'T').charAt(0).toUpperCase())}</div>`

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(receiptDocument?.receipt?.number || 'Receipt')}</title>
    <style>
      @page { size: A4; margin: 18mm; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #f6f7f4; color: #1f2a24; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.65; }
      .document-page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #ffffff; padding: 22mm 20mm; }
      .letterhead { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; padding-bottom: 18px; border-bottom: 2px solid #234832; }
      .company-name { margin: 0; color: #234832; font-size: 22px; font-weight: 700; }
      .muted { color: #667267; font-size: 13px; margin: 6px 0 0; }
      .address { color: #667267; font-size: 12px; margin: 10px 0 0; }
      .meta-right { text-align: right; }
      .label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #667267; }
      .value { display: block; margin-top: 4px; font-size: 15px; font-weight: 600; }
      .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 22px; }
      .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 22px; }
      .grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
      .card { border: 1px solid #d9dfd8; border-radius: 10px; padding: 16px; }
      .section { margin-top: 22px; }
      table { width: 100%; border-collapse: collapse; margin-top: 14px; }
      th, td { padding: 10px 12px; border-bottom: 1px solid #d9dfd8; text-align: left; }
      th { color: #667267; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
      td { font-size: 13px; }
      .pill { display: inline-block; padding: 6px 12px; border-radius: 999px; background: #eaf3ed; color: #234832; font-size: 12px; font-weight: 700; }
      .amount { font-size: 26px; font-weight: 700; color: #234832; }
      .footer-note { margin-top: 32px; padding-top: 12px; border-top: 1px solid #d9dfd8; color: #667267; font-size: 12px; }
      @media print { body { background: #ffffff; } .document-page { width: auto; min-height: auto; margin: 0; padding: 0; } }
    </style>
  </head>
  <body>
    <main class="document-page">
      <header class="letterhead">
        <div>
          ${logo}
          <h1 class="company-name">${escapeHtml(company.name || 'Company')}</h1>
          <p class="muted">${escapeHtml(company.tagline || 'Intelligent Real Estate Operations')}</p>
          <p class="address">${escapeHtml(company.address || 'Company address not configured')}</p>
        </div>
        <div class="meta-right">
          <span class="label">${escapeHtml(receiptDocument?.document_type || 'Receipt')}</span>
          <span class="value" style="font-size: 18px; margin-top: 6px;">${escapeHtml(receiptDocument?.receipt?.number || 'Receipt')}</span>
          <p class="muted" style="margin-top: 8px;">Generated ${escapeHtml(formatDate(receiptDocument?.receipt?.generated_at, true))}</p>
        </div>
      </header>

      <section class="grid-3">
        <div class="card">
          <span class="label">Client</span>
          <span class="value">${escapeHtml(client.full_name || 'Client')}</span>
          <p class="muted">${escapeHtml(client.email || 'No email')}</p>
        </div>
        <div class="card">
          <span class="label">Realtor</span>
          <span class="value">${escapeHtml(realtor.full_name || 'Direct client')}</span>
          <p class="muted">${escapeHtml(realtor.company_name || 'Independent')}</p>
        </div>
        <div class="card">
          <span class="label">Property</span>
          <span class="value">${escapeHtml(property.title || 'Property')}</span>
          <p class="muted">${escapeHtml(property.location || 'No location')}</p>
        </div>
      </section>

      <section class="section">
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
          <div>
            <p class="label">Current payment</p>
            <p class="amount">${escapeHtml(formatMoney(payment.amount || 0))}</p>
          </div>
          <div class="pill">${escapeHtml(balance > 0 ? `${formatMoney(balance)} outstanding` : 'Fully cleared')}</div>
        </div>
        <div class="grid-4">
          <div class="card">
            <span class="label">Method</span>
            <span class="value">${escapeHtml(payment.method || 'Not specified')}</span>
          </div>
          <div class="card">
            <span class="label">Paid at</span>
            <span class="value">${escapeHtml(formatDate(payment.paid_at, true))}</span>
          </div>
          <div class="card">
            <span class="label">Progress</span>
            <span class="value">${escapeHtml(`${progress}%`)}</span>
          </div>
          <div class="card">
            <span class="label">Balance</span>
            <span class="value">${escapeHtml(formatMoney(balance))}</span>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="grid-2">
          <div class="card">
            <p class="label">Allocation</p>
            <p class="value">${escapeHtml(allocation.reference || 'Allocation summary')}</p>
          </div>
          <div class="card">
            <p class="label">Payment duration</p>
            <p class="value">${escapeHtml(allocation.payment_duration_label || 'One-time Payment')}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows}
          </tbody>
        </table>
      </section>

      <p class="footer-note">
        ${notes.length ? notes.map((note) => `<span>${escapeHtml(note)}</span>`).join('<br />') : 'Thank you for your business.'}
        <br />
        Generated on ${escapeHtml(formatDate(receiptDocument?.receipt?.generated_at || new Date().toISOString()))}.
      </p>
    </main>
  </body>
</html>`
}

export function ReceiptDocumentModal({ receiptDocument, loading, error, onClose, receiptHistory = [], activeReceiptIndex = 0, onNavigateReceipt }) {
  const receiptHtml = receiptDocument ? buildReceiptHtml(receiptDocument) : ''

  function printDocument() {
    if (!receiptHtml) {
      return
    }

    const printWindow = window.open('', '_blank', 'noopener,noreferrer')

    if (!printWindow) {
      return
    }

    printWindow.document.open()
    printWindow.document.write(receiptHtml)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  function downloadDocument() {
    if (!receiptHtml) {
      return
    }

    const blob = new Blob([receiptHtml], { type: 'text/html;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = window.document.createElement('a')

    link.href = url
    link.download = `receipt_${receiptDocument?.receipt?.number || 'document'}.html`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 px-0 py-0 backdrop-blur-sm sm:px-4 sm:py-6">
      <div className="mx-auto min-h-screen w-full max-w-[900px] border border-line bg-canvas shadow-2xl sm:min-h-0 sm:rounded-lg">
        <div className="receipt-actions sticky top-0 z-10 flex flex-col gap-3 border-b border-line bg-panel px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-brand/10 text-brand">
              <ReceiptText size={19} />
            </span>
            <div>
              <p className="text-sm font-medium text-brand">Receipt document</p>
              <h3 className="mt-1 text-lg font-semibold text-ink">{receiptDocument?.receipt?.number || 'Transaction document'}</h3>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {receiptHistory.length > 1 ? (
              <div className="flex items-center gap-2 rounded-md border border-line bg-white px-2 py-1.5">
                <button type="button" onClick={() => onNavigateReceipt?.(-1)} disabled={activeReceiptIndex <= 0} className="rounded px-2 py-1 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40">
                  Previous
                </button>
                <span className="text-sm font-medium text-muted">{activeReceiptIndex + 1} / {receiptHistory.length}</span>
                <button type="button" onClick={() => onNavigateReceipt?.(1)} disabled={activeReceiptIndex >= receiptHistory.length - 1} className="rounded px-2 py-1 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40">
                  Next
                </button>
              </div>
            ) : null}
            <button type="button" onClick={printDocument} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-canvas">
              <Printer size={16} />
              Print
            </button>
            <button type="button" onClick={downloadDocument} className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              <Download size={16} />
              Download
            </button>
            <button type="button" onClick={onClose} className="rounded-md p-2 text-muted hover:bg-canvas" aria-label="Close receipt document">
              <X size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center gap-2 text-sm text-muted">
            <Loader2 size={18} className="animate-spin" />
            Loading receipt document
          </div>
        ) : error ? (
          <div className="m-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : receiptDocument ? (
          <div className="p-4 sm:p-5">
            <div
              className="mx-auto max-w-[850px] overflow-hidden rounded-md border border-line bg-white shadow-sm"
              dangerouslySetInnerHTML={{ __html: receiptHtml }}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
