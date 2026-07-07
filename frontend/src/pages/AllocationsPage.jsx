import {
  CalendarDays,
  CreditCard,
  Edit3,
  Eye,
  FileText,
  Home,
  Loader2,
  MapPin,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, propertyImageUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { canCancelAllocations, canManageAllocations } from '../auth/permissions'
import { ReceiptDocumentModal } from '../components/receipts/ReceiptDocument'
import { formatMoney } from '../utils/formatters'
import { customDurationUnits, formatPaymentDuration, paymentDurationOptions } from '../utils/paymentDuration'

const allocationStatuses = ['reserved', 'active', 'completed', 'cancelled']
const paymentPlans = ['installment', 'full']

const emptyForm = {
  property_id: '',
  client_id: '',
  realtor_id: '',
  total_amount: '',
  payment_plan: 'installment',
  payment_duration: 'one_time',
  custom_duration_value: '',
  custom_duration_unit: 'months',
  payment_status: 'unpaid',
  allocated_at: '',
  notes: '',
  initial_payment_amount: '',
  payment_method: '',
  paid_at: '',
  payment_screenshot_file: null,
}

const quickCreateDefaults = {
  realtor: { full_name: '', phone: '', email: '', company_name: '', status: 'active' },
  client: { first_name: '', last_name: '', phone: '', email: '', realtor_id: '' },
  property: { title: '', type: 'land', location: '', price: '', property_count: 1, status: 'available' },
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
    reserved: 'bg-amber-50 text-amber-700 border-amber-200',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    completed: 'bg-slate-100 text-slate-700 border-slate-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold capitalize ${
        styles[status] || styles.active
      }`}
    >
      {status}
    </span>
  )
}

function realtorName(allocation) {
  return allocation?.realtor?.full_name || allocation?.client?.realtor?.full_name || 'Direct'
}

function allocationReceipts(allocation) {
  return (allocation?.payments || [])
    .filter((payment) => payment?.receipt?.id)
    .sort((left, right) => {
      const leftDate = new Date(left?.paid_at || left?.created_at || 0).getTime()
      const rightDate = new Date(right?.paid_at || right?.created_at || 0).getTime()

      return rightDate - leftDate || Number(right?.id || 0) - Number(left?.id || 0)
    })
}

function allocationReceipt(allocation) {
  return allocationReceipts(allocation)[0]?.receipt || null
}

function hasReceipt(allocation) {
  return allocationReceipts(allocation).length > 0
}

function lastPaymentDate(allocation) {
  const latestPayment = allocation?.payments?.[0]

  if (!latestPayment?.paid_at) {
    return 'No payment yet'
  }

  return new Date(latestPayment.paid_at).toLocaleString()
}

function QuickCreateModal({ type, submitting, error, onClose, onSubmit }) {
  const [form, setForm] = useState(() => quickCreateDefaults[type])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({
      ...form,
      price: form.price ? Number(form.price) : undefined,
      property_count: form.property_count ? Number(form.property_count) : undefined,
    })
  }

  const title = type === 'realtor' ? 'Add realtor' : type === 'client' ? 'Add client' : 'Add property'

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-ink/50 px-4 py-6">
      <div className="mx-auto w-full max-w-xl rounded-lg border border-line bg-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-sm font-medium text-brand">Quick create</p>
            <h3 className="mt-1 text-lg font-semibold text-ink">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted hover:bg-canvas" aria-label="Close quick create">
            <X size={20} />
          </button>
        </div>
        <form className="space-y-4 p-5" onSubmit={handleSubmit}>
          {type === 'realtor' ? (
            <>
              <label className="block"><span className="text-sm font-medium text-ink">Full name</span><input value={form.full_name} onChange={(event) => updateField('full_name', event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-brand" required /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="text-sm font-medium text-ink">Phone</span><input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-brand" /></label>
                <label className="block"><span className="text-sm font-medium text-ink">Email</span><input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-brand" /></label>
              </div>
              <label className="block"><span className="text-sm font-medium text-ink">Company</span><input value={form.company_name} onChange={(event) => updateField('company_name', event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-brand" /></label>
            </>
          ) : null}

          {type === 'client' ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="text-sm font-medium text-ink">First name</span><input value={form.first_name} onChange={(event) => updateField('first_name', event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-brand" required /></label>
                <label className="block"><span className="text-sm font-medium text-ink">Last name</span><input value={form.last_name} onChange={(event) => updateField('last_name', event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-brand" required /></label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="text-sm font-medium text-ink">Phone</span><input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-brand" /></label>
                <label className="block"><span className="text-sm font-medium text-ink">Email</span><input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-brand" /></label>
              </div>
            </>
          ) : null}

          {type === 'property' ? (
            <>
              <label className="block"><span className="text-sm font-medium text-ink">Title</span><input value={form.title} onChange={(event) => updateField('title', event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-brand" required /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="text-sm font-medium text-ink">Type</span><input value={form.type} onChange={(event) => updateField('type', event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-brand" required /></label>
                <label className="block"><span className="text-sm font-medium text-ink">Location</span><input value={form.location} onChange={(event) => updateField('location', event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-brand" required /></label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="text-sm font-medium text-ink">Price</span><input type="number" min="0" value={form.price} onChange={(event) => updateField('price', event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-brand" required /></label>
                <label className="block"><span className="text-sm font-medium text-ink">Property count</span><input type="number" min="1" value={form.property_count} onChange={(event) => updateField('property_count', event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm outline-none focus:border-brand" required /></label>
              </div>
            </>
          ) : null}

          {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          <div className="flex justify-end gap-3 border-t border-line pt-4">
            <button type="button" onClick={onClose} className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-muted hover:bg-canvas">Cancel</button>
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AllocationModal({
  clients,
  properties,
  realtors,
  submitting,
  error,
  onClose,
  onSubmit,
  onQuickCreate,
  quickSelection,
}) {
  const [form, setForm] = useState(emptyForm)
  const showFirstPayment = form.payment_status !== 'unpaid'
  const selectedProperty = properties.find(
    (property) => String(property.id) === String(form.property_id),
  )
  const selectedClient = clients.find(
    (client) => String(client.id) === String(form.client_id),
  )
  const selectedRealtor = realtors.find(
    (realtor) => String(realtor.id) === String(form.realtor_id),
  )
  const inputClass =
    'mt-2 h-11 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10'
  const textAreaClass =
    'mt-2 w-full resize-y rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10'

  useEffect(() => {
    if (!quickSelection) {
      return
    }

    let active = true

    queueMicrotask(() => {
      if (!active) {
        return
      }

      setForm((current) => {
        const next = {
          ...current,
          [`${quickSelection.type}_id`]: String(quickSelection.id),
        }

        if (quickSelection.type === 'property') {
          const property = properties.find((item) => Number(item.id) === Number(quickSelection.id))
          next.total_amount = property?.price ?? current.total_amount
        }

        if (quickSelection.type === 'client') {
          const client = clients.find((item) => Number(item.id) === Number(quickSelection.id))
          next.realtor_id = client?.realtor_id ? String(client.realtor_id) : current.realtor_id
        }

        return next
      })
    })

    return () => {
      active = false
    }
  }, [clients, properties, quickSelection])

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value }

      if (field === 'property_id') {
        const property = properties.find((item) => String(item.id) === String(value))

        if (property?.price !== undefined && property?.price !== null && property?.price !== '') {
          next.total_amount = property.price
          if (next.payment_status === 'paid') {
            next.initial_payment_amount = property.price
          }
        } else {
          next.total_amount = ''
          if (next.payment_status === 'paid') {
            next.initial_payment_amount = ''
          }
        }
      }

      if (field === 'client_id') {
        const client = clients.find((item) => String(item.id) === String(value))
        next.realtor_id = client?.realtor_id ? String(client.realtor_id) : ''
      }

      if (field === 'payment_plan' && value === 'full') {
        next.initial_payment_amount = next.total_amount
      }

      if (field === 'payment_duration' && value !== 'custom') {
        next.custom_duration_value = ''
        next.custom_duration_unit = 'months'
      }

      if (field === 'payment_status') {
        if (value === 'paid') {
          next.payment_plan = 'full'
          next.initial_payment_amount = next.total_amount
        }

        if (value === 'unpaid') {
          next.initial_payment_amount = ''
          next.payment_method = ''
          next.paid_at = ''
        }
      }

      return next
    })
  }

  function handleSubmit(event) {
    event.preventDefault()

    const payload = {
      property_id: Number(form.property_id),
      client_id: Number(form.client_id),
      realtor_id: form.realtor_id ? Number(form.realtor_id) : undefined,
      total_amount: Number(form.total_amount),
      payment_plan: form.payment_plan,
      payment_duration: form.payment_duration,
      custom_duration_value: form.payment_duration === 'custom' && form.custom_duration_value
        ? Number(form.custom_duration_value)
        : undefined,
      custom_duration_unit: form.payment_duration === 'custom'
        ? form.custom_duration_unit
        : undefined,
      payment_status: form.payment_status,
      allocated_at: form.allocated_at || undefined,
      notes: form.notes || undefined,
      initial_payment_amount: showFirstPayment && form.initial_payment_amount
        ? Number(form.initial_payment_amount)
        : undefined,
      payment_method: showFirstPayment ? form.payment_method || undefined : undefined,
      paid_at: showFirstPayment ? form.paid_at || undefined : undefined,
      payment_screenshot_file: form.payment_screenshot_file || undefined,
    }

    onSubmit(payload)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 px-0 py-0 backdrop-blur-sm sm:px-4 sm:py-6">
      <div className="mx-auto min-h-screen w-full max-w-5xl border border-line bg-canvas shadow-2xl sm:min-h-0 sm:rounded-lg">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-panel px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand">Allocation</p>
            <h3 className="mt-1 text-lg font-semibold text-ink sm:text-xl">Create allocation</h3>
            <p className="mt-1 text-sm text-muted">
              Link the buyer, realtor, property, and first payment in one clean record.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-muted hover:bg-canvas"
            onClick={onClose}
            aria-label="Close allocation form"
          >
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4 p-4 sm:p-5" onSubmit={handleSubmit}>
          <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-brand/10 text-brand">
                <Users size={18} />
              </span>
              <div>
                <h4 className="text-sm font-semibold text-ink">Allocation details</h4>
                <p className="text-xs text-muted">Choose the property, client, and realtor.</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="block">
                <span className="text-sm font-medium text-ink">Property</span>
                <select
                  value={form.property_id}
                  onChange={(event) => updateField('property_id', event.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Select property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-muted">
                  {selectedProperty
                    ? `${selectedProperty.location} - ${selectedProperty.available_count ?? 0} available`
                    : 'Properties with available plots only'}
                </p>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-ink">Client</span>
                <select
                  value={form.client_id}
                  onChange={(event) => {
                    if (event.target.value === '__new_client__') {
                      onQuickCreate('client')
                      return
                    }

                    updateField('client_id', event.target.value)
                  }}
                  className={inputClass}
                  required
                >
                  <option value="">Select client</option>
                  <option value="__new_client__">+ Add New Client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-muted">
                  {selectedClient?.phone || selectedClient?.email || 'Buyer profile'}
                </p>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-ink">Realtor</span>
                <select
                  value={form.realtor_id}
                  onChange={(event) => {
                    if (event.target.value === '__new_realtor__') {
                      onQuickCreate('realtor')
                      return
                    }

                    updateField('realtor_id', event.target.value)
                  }}
                  className={inputClass}
                >
                  <option value="">No linked realtor</option>
                  <option value="__new_realtor__">+ Add New Realtor</option>
                  {realtors.map((realtor) => (
                    <option key={realtor.id} value={realtor.id}>
                      {realtor.full_name}
                      {realtor.company_name ? ` - ${realtor.company_name}` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-muted">
                  {selectedRealtor?.company_name || 'Optional sales partner'}
                </p>
              </label>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-accent/10 text-accent">
                  <CreditCard size={18} />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-ink">Payment setup</h4>
                  <p className="text-xs text-muted">Set the total amount and payment plan.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-ink">Total amount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.total_amount}
                    readOnly
                    className={`${inputClass} cursor-not-allowed bg-canvas text-muted`}
                    required
                  />
                  <p className="mt-2 text-xs text-muted">Pulled from the selected property price.</p>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-ink">Payment plan</span>
                  <select
                    value={form.payment_plan}
                    onChange={(event) =>
                      updateField('payment_plan', event.target.value)
                    }
                    className={`${inputClass} capitalize`}
                  >
                    {paymentPlans.map((plan) => (
                      <option key={plan} value={plan}>
                        {plan}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-ink">Payment status</span>
                  <select
                    value={form.payment_status}
                    onChange={(event) => updateField('payment_status', event.target.value)}
                    className={`${inputClass} capitalize`}
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="part_payment">Part Payment</option>
                    <option value="paid">Paid</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-ink">Payment Duration</span>
                  <select
                    value={form.payment_duration}
                    onChange={(event) => updateField('payment_duration', event.target.value)}
                    className={inputClass}
                    required
                  >
                    {paymentDurationOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-ink">Allocation date</span>
                  <input
                    type="date"
                    value={form.allocated_at}
                    onChange={(event) =>
                      updateField('allocated_at', event.target.value)
                    }
                    className={inputClass}
                  />
                </label>
              </div>

              {form.payment_duration === 'custom' ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Duration Number</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form.custom_duration_value}
                      onChange={(event) => updateField('custom_duration_value', event.target.value)}
                      className={inputClass}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Duration Unit</span>
                    <select
                      value={form.custom_duration_unit}
                      onChange={(event) => updateField('custom_duration_unit', event.target.value)}
                      className={inputClass}
                      required
                    >
                      {customDurationUnits.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
            </div>

            {showFirstPayment ? (
              <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-brand/10 text-brand">
                    <CalendarDays size={18} />
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-ink">First payment</h4>
                    <p className="text-xs text-muted">Receipts are generated automatically after payment.</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Amount paid</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.initial_payment_amount}
                      onChange={(event) => updateField('initial_payment_amount', event.target.value)}
                      className={inputClass}
                      placeholder={selectedProperty?.price ? formatMoney(selectedProperty.price) : '0'}
                      readOnly={form.payment_status === 'paid'}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Payment date</span>
                    <input
                      type="date"
                      value={form.paid_at}
                      onChange={(event) => updateField('paid_at', event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Payment method</span>
                    <input
                      value={form.payment_method}
                      onChange={(event) =>
                        updateField('payment_method', event.target.value)
                      }
                      className={inputClass}
                      placeholder="bank_transfer, cash, pos"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">Payment screenshot</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null
                        updateField('payment_screenshot_file', file)
                      }}
                      className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none file:mr-4 file:rounded-md file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                      required={showFirstPayment}
                    />
                    {form.payment_screenshot_file ? (
                      <div className="mt-3 flex items-center gap-3 rounded-md border border-line bg-canvas p-3">
                        <img src={URL.createObjectURL(form.payment_screenshot_file)} alt="Payment screenshot preview" className="h-14 w-14 rounded-md object-contain" />
                        <p className="text-sm text-muted">Screenshot ready</p>
                      </div>
                    ) : null}
                  </label>
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-canvas text-muted">
                <UserPlus size={18} />
              </span>
              <div>
                <h4 className="text-sm font-semibold text-ink">Notes</h4>
                <p className="text-xs text-muted">Internal context for this allocation.</p>
              </div>
            </div>
            <textarea
              value={form.notes}
              onChange={(event) => updateField('notes', event.target.value)}
              rows="3"
              className={textAreaClass}
              placeholder="Add allocation notes"
            />
          </section>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col-reverse gap-3 border-t border-line bg-panel px-4 py-4 sm:-mx-5 sm:-mb-5 sm:flex-row sm:justify-end sm:px-5">
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
              Create allocation
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditAllocationModal({ allocation, submitting, error, onClose, onSubmit }) {
  const [form, setForm] = useState({
    payment_status: 'unpaid',
    payment_duration: allocation.payment_duration || 'one_time',
    custom_duration_value: allocation.custom_duration_value || '',
    custom_duration_unit: allocation.custom_duration_unit || 'months',
    initial_payment_amount: '',
    payment_method: '',
    paid_at: '',
    notes: allocation.notes || '',
    payment_screenshot_file: null,
  })
  const showPaymentFields = form.payment_status !== 'unpaid'
  const projectedBalance = Math.max(Number(allocation.balance || 0) - Number(form.initial_payment_amount || 0), 0)

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value }

      if (field === 'payment_status') {
        if (value === 'paid') {
          next.initial_payment_amount = allocation.balance || ''
        }

        if (value === 'unpaid') {
          next.initial_payment_amount = ''
          next.payment_method = ''
          next.paid_at = ''
        }
      }

      if (field === 'payment_duration' && value !== 'custom') {
        next.custom_duration_value = ''
        next.custom_duration_unit = 'months'
      }

      return next
    })
  }

  function handleSubmit(event) {
    event.preventDefault()

    onSubmit({
      payment_duration: form.payment_duration,
      custom_duration_value: form.payment_duration === 'custom' && form.custom_duration_value
        ? Number(form.custom_duration_value)
        : undefined,
      custom_duration_unit: form.payment_duration === 'custom'
        ? form.custom_duration_unit
        : undefined,
      payment_status: form.payment_status,
      initial_payment_amount: showPaymentFields && form.initial_payment_amount
        ? Number(form.initial_payment_amount)
        : undefined,
      payment_method: showPaymentFields ? form.payment_method || undefined : undefined,
      paid_at: showPaymentFields ? form.paid_at || undefined : undefined,
      notes: form.notes || undefined,
      payment_screenshot_file: form.payment_screenshot_file || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 px-0 py-0 backdrop-blur-sm sm:px-4 sm:py-6">
      <div className="mx-auto min-h-screen w-full max-w-4xl border border-line bg-canvas shadow-2xl sm:min-h-0 sm:rounded-lg">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-panel px-4 py-4 sm:px-5">
          <div>
            <p className="text-sm font-medium text-brand">Edit allocation</p>
            <h3 className="mt-1 text-lg font-semibold text-ink">{allocation.client?.full_name || 'Client'}</h3>
            <p className="mt-1 text-sm text-muted">{allocation.property?.title || 'Property'} · {formatMoney(allocation.total_amount)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted hover:bg-canvas" aria-label="Close allocation editor">
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4 p-4 sm:p-5" onSubmit={handleSubmit}>
          <section className="grid gap-3 sm:grid-cols-5">
            {[
              ['Current status', allocation.status],
              ['Total paid', formatMoney(allocation.amount_paid)],
              ['Outstanding', formatMoney(allocation.balance)],
              ['Duration', formatPaymentDuration(allocation)],
              ['Last payment', lastPaymentDate(allocation)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-line bg-panel p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase text-muted">{label}</p>
                <p className="mt-2 truncate text-sm font-semibold capitalize text-ink">{value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-ink">Payment update</span>
                <select value={form.payment_status} onChange={(event) => updateField('payment_status', event.target.value)} className="mt-2 h-11 w-full rounded-md border border-line bg-white px-3 text-sm capitalize outline-none focus:border-brand">
                  <option value="unpaid">No new payment</option>
                  <option value="part_payment">Part Payment</option>
                  <option value="paid">Paid</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Outstanding balance</span>
                <input value={formatMoney(projectedBalance)} readOnly className="mt-2 h-11 w-full cursor-not-allowed rounded-md border border-line bg-canvas px-3 text-sm text-muted outline-none" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Payment Duration</span>
                <select value={form.payment_duration} onChange={(event) => updateField('payment_duration', event.target.value)} className="mt-2 h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-brand" required>
                  {paymentDurationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {form.payment_duration === 'custom' ? (
                <>
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Duration Number</span>
                    <input type="number" min="1" step="1" value={form.custom_duration_value} onChange={(event) => updateField('custom_duration_value', event.target.value)} className="mt-2 h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-brand" required />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Duration Unit</span>
                    <select value={form.custom_duration_unit} onChange={(event) => updateField('custom_duration_unit', event.target.value)} className="mt-2 h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-brand" required>
                      {customDurationUnits.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}
            </div>

            {showPaymentFields ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-ink">Payment amount</span>
                  <input type="number" min="0.01" max={allocation.balance || undefined} step="0.01" value={form.initial_payment_amount} onChange={(event) => updateField('initial_payment_amount', event.target.value)} className="mt-2 h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-brand" required />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-ink">Payment date</span>
                  <input type="datetime-local" value={form.paid_at} onChange={(event) => updateField('paid_at', event.target.value)} className="mt-2 h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-brand" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-ink">Payment method</span>
                  <input value={form.payment_method} onChange={(event) => updateField('payment_method', event.target.value)} className="mt-2 h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-brand" placeholder="bank_transfer, cash, pos" />
                </label>
               </div>
             ) : null}

             {showPaymentFields ? (
             <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
               <div className="mb-4 flex items-center gap-2">
                 <span className="grid h-9 w-9 place-items-center rounded-md bg-accent/10 text-accent">
                   <ReceiptText size={18} />
                 </span>
                 <div>
                   <h4 className="text-sm font-semibold text-ink">Payment proof</h4>
                   <p className="text-xs text-muted">Upload a payment screenshot for this payment.</p>
                 </div>
               </div>
               <label className="block">
                 <span className="text-sm font-medium text-ink">Payment screenshot</span>
                 <input
                   type="file"
                   accept="image/*"
                   onChange={(event) => {
                     const file = event.target.files?.[0] ?? null
                     updateField('payment_screenshot_file', file)
                   }}
                   className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none file:mr-4 file:rounded-md file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                   required={showPaymentFields}
                 />
                 {allocation.payment_screenshot && !form.payment_screenshot_file ? (
                   <div className="mt-4 flex items-center gap-4 rounded-md border border-line bg-canvas p-4">
                     <img src={allocation.payment_screenshot} alt="Current payment screenshot" className="h-16 w-16 rounded-md object-contain" />
                     <p className="text-sm text-muted">Current screenshot</p>
                   </div>
                 ) : null}
                 {form.payment_screenshot_file ? (
                   <div className="mt-4 flex items-center gap-4 rounded-md border border-line bg-canvas p-4">
                     <img src={URL.createObjectURL(form.payment_screenshot_file)} alt="Payment preview" className="h-16 w-16 rounded-md object-contain" />
                     <p className="text-sm text-muted">New screenshot preview</p>
                   </div>
                 ) : null}
               </label>
             </div>
             ) : null}
           </section>

          <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-ink">Payment history</h4>
            <div className="mt-3 space-y-2">
              {allocation.payments?.map((payment) => (
                <div key={payment.id} className="flex flex-col gap-1 rounded-md border border-line bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-ink">{formatMoney(payment.amount)}</span>
                  <span className="text-muted">{payment.payment_method || 'No method'}</span>
                  <span className="text-muted">{payment.receipt?.receipt_number || 'No receipt'}</span>
                  <span className="text-muted">{payment.paid_at ? new Date(payment.paid_at).toLocaleString() : '-'}</span>
                </div>
              ))}
              {!allocation.payments?.length ? (
                <p className="rounded-md bg-canvas p-4 text-sm text-muted">No payments recorded yet. Use this form to add the first payment.</p>
              ) : null}
            </div>
          </section>

          <label className="block">
            <span className="text-sm font-medium text-ink">Allocation notes</span>
            <textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} rows="3" className="mt-2 w-full resize-y rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand" />
          </label>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-muted hover:bg-canvas hover:text-ink">Cancel</button>
            <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              Save allocation
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function AllocationsPage() {
  const { user } = useAuth()
  const isAdminAuthorizedToCancel = canCancelAllocations(user)
  const isAdmin = user?.role === 'admin'
  const canManage = canManageAllocations(user)
  const [allocations, setAllocations] = useState([])
  const [clients, setClients] = useState([])
  const [properties, setProperties] = useState([])
  const [realtors, setRealtors] = useState([])
  const [meta, setMeta] = useState(null)
  const [filters, setFilters] = useState({ status: '' })
  const [query, setQuery] = useState({ status: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [quickCreateType, setQuickCreateType] = useState(null)
  const [quickCreateSelection, setQuickCreateSelection] = useState(null)
  const [quickSubmitting, setQuickSubmitting] = useState(false)
  const [quickError, setQuickError] = useState('')
  const [error, setError] = useState('')
  const [allocationFormError, setAllocationFormError] = useState('')
  const [editAllocationError, setEditAllocationError] = useState('')
  const [notice, setNotice] = useState('')
  const [editAllocation, setEditAllocation] = useState(null)
  const [receiptDocument, setReceiptDocument] = useState(null)
  const [receiptHistory, setReceiptHistory] = useState([])
  const [activeReceiptIndex, setActiveReceiptIndex] = useState(0)
  const [activeAllocation, setActiveAllocation] = useState(null)
  const [documentLoading, setDocumentLoading] = useState(false)
  const [documentError, setDocumentError] = useState('')

  const availableProperties = useMemo(
    () => properties.filter((property) => {
      return property.status !== 'sold' && Number(property.available_count || 0) > 0
    }),
    [properties],
  )

  const loadAllocations = useCallback(async (params) => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/allocations', {
        params: {
          per_page: 20,
          status: params.status || undefined,
        },
      })

      setAllocations(response.data.data)
      setMeta(response.data.meta)
    } catch (err) {
      setError(getApiError(err, 'Allocations could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadFormOptions = useCallback(async () => {
    try {
      const response = await api.get('/allocations/form-options')

      setClients(response.data.data.clients)
      setProperties(response.data.data.properties)
      setRealtors(response.data.data.realtors)
    } catch (err) {
      setError(getApiError(err, 'Form options could not be loaded.'))
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAllocations(query)
      loadFormOptions()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadAllocations, loadFormOptions, query])

  function applyFilters(event) {
    event.preventDefault()
    setQuery(filters)
  }

  function resetFilters() {
    const nextFilters = { status: '' }
    setFilters(nextFilters)
    setQuery(nextFilters)
  }

  async function handleSubmit(payload) {
    if (submitting) {
      return
    }

    setSubmitting(true)
    setAllocationFormError('')
    setNotice('')

    try {
      if (payload.payment_screenshot_file instanceof File) {
        const body = new FormData()
        const fields = [
          'property_id',
          'client_id',
          'realtor_id',
          'total_amount',
          'payment_plan',
          'payment_duration',
          'custom_duration_value',
          'custom_duration_unit',
          'payment_status',
          'allocated_at',
          'notes',
          'initial_payment_amount',
          'payment_method',
          'paid_at',
        ]

        fields.forEach((field) => {
          if (payload[field] !== undefined && payload[field] !== null && payload[field] !== '') {
            body.append(field, payload[field])
          }
        })

        body.append('payment_screenshot', payload.payment_screenshot_file)
        await api.post('/allocations', body)
      } else {
        await api.post('/allocations', payload)
      }

      setNotice('Allocation created successfully.')
      setModalOpen(false)
      await loadAllocations(query)
      await loadFormOptions()
    } catch (err) {
      setAllocationFormError(getApiError(err, 'Allocation could not be created.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleQuickCreate(payload) {
    setQuickSubmitting(true)
    setQuickError('')

    try {
      const endpoints = {
        realtor: '/realtors',
        client: '/clients',
        property: '/properties',
      }
      const response = await api.post(endpoints[quickCreateType], payload)
      const created = response.data.data[quickCreateType]

      if (quickCreateType === 'realtor') {
        setRealtors((current) => [created, ...current.filter((item) => item.id !== created.id)])
      }

      if (quickCreateType === 'client') {
        setClients((current) => [created, ...current.filter((item) => item.id !== created.id)])
      }

      if (quickCreateType === 'property') {
        setProperties((current) => [created, ...current.filter((item) => item.id !== created.id)])
      }

      setQuickCreateSelection({ type: quickCreateType, id: created.id })
      setQuickCreateType(null)
      setNotice(`${quickCreateType} created successfully.`)
    } catch (err) {
      setQuickError(getApiError(err, 'Record could not be created.'))
    } finally {
      setQuickSubmitting(false)
    }
  }

  async function cancelAllocation(allocation) {
    const confirmed = window.confirm(
      `Cancel allocation for ${allocation.client?.full_name || 'this client'}?`,
    )

    if (!confirmed) {
      return
    }

    setError('')
    setNotice('')

    try {
      await api.delete(`/allocations/${allocation.id}`)
      setNotice('Allocation cancelled successfully.')
      await loadAllocations(query)
      await loadFormOptions()
    } catch (err) {
      setError(getApiError(err, 'Allocation could not be cancelled.'))
    }
  }

  async function handleAllocationUpdate(allocation, payload) {
    setSubmitting(true)
    setEditAllocationError('')
    setNotice('')

    try {
      if (payload.payment_screenshot_file instanceof File) {
        const body = new FormData()
        body.append('_method', 'PATCH')
        const fields = [
          'payment_duration',
          'custom_duration_value',
          'custom_duration_unit',
          'payment_status',
          'initial_payment_amount',
          'payment_method',
          'paid_at',
          'notes',
        ]

        fields.forEach((field) => {
          if (payload[field] !== undefined && payload[field] !== null && payload[field] !== '') {
            body.append(field, payload[field])
          }
        })

        body.append('payment_screenshot', payload.payment_screenshot_file)
        await api.post(`/allocations/${allocation.id}`, body)
      } else {
        await api.patch(`/allocations/${allocation.id}`, payload)
      }

      setNotice('Allocation updated successfully.')
      setEditAllocation(null)
      await loadAllocations(query)
      await loadFormOptions()
    } catch (err) {
      setEditAllocationError(getApiError(err, 'Allocation could not be updated.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function loadReceiptDocument(receiptId) {
    setReceiptDocument(null)
    setDocumentError('')
    setDocumentLoading(true)

    try {
      const response = await api.get(`/receipts/${receiptId}/document`)
      setReceiptDocument(response.data.data)
    } catch (err) {
      setDocumentError(getApiError(err, 'Receipt document could not be loaded.'))
    } finally {
      setDocumentLoading(false)
    }
  }

  async function viewReceiptDocument(allocation, receiptIndex = 0) {
    const history = allocationReceipts(allocation)
    const safeIndex = Math.max(0, Math.min(receiptIndex, history.length - 1))
    const latestReceipt = history[safeIndex]?.receipt

    if (!latestReceipt?.id) {
      setError('No generated receipt is available for this allocation yet.')
      return
    }

    setActiveAllocation(allocation)
    setReceiptHistory(history)
    setActiveReceiptIndex(safeIndex)
    await loadReceiptDocument(latestReceipt.id)
  }

  function navigateReceipt(direction) {
    if (!activeAllocation || !receiptHistory.length) {
      return
    }

    const nextIndex = activeReceiptIndex + direction

    if (nextIndex < 0 || nextIndex >= receiptHistory.length) {
      return
    }

    setActiveReceiptIndex(nextIndex)
    const nextReceipt = receiptHistory[nextIndex]?.receipt

    if (nextReceipt?.id) {
      void loadReceiptDocument(nextReceipt.id)
    }
  }

  function closeReceiptDocument() {
    setReceiptDocument(null)
    setReceiptHistory([])
    setActiveReceiptIndex(0)
    setActiveAllocation(null)
    setDocumentError('')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-brand">Allocations</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            Property allocations
          </h2>
          <p className="mt-2 text-sm text-muted">
            Assign properties to clients and track balances from the first payment.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={() => {
              setQuickCreateSelection(null)
              setAllocationFormError('')
              setModalOpen(true)
            }}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            <Plus size={17} />
            New allocation
          </button>
        ) : null}
      </div>

      <form
        className="grid gap-3 rounded-lg border border-line bg-panel p-4 shadow-sm md:grid-cols-[220px_auto_auto]"
        onSubmit={applyFilters}
      >
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
          {allocationStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-brand bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Search size={16} />
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

      <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-sm">
        <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-brand/10 text-brand">
              <Home size={18} />
            </span>
            <div>
              <h3 className="text-base font-semibold text-ink">Allocations</h3>
              <p className="text-xs text-muted">Buyer, property, and balance overview</p>
            </div>
          </div>
          <span className="rounded-md border border-line bg-canvas px-3 py-1.5 text-sm font-semibold text-muted">
            {meta?.total ?? allocations.length} total
          </span>
        </div>

<div className="grid gap-3 p-3 md:hidden">
           {allocations.map((allocation) => {
             const receipt = allocationReceipt(allocation)
             const receiptAvailable = hasReceipt(allocation)
             const canEdit = allocation.status !== 'cancelled' && allocation.status !== 'completed'
             const canCancel = ['active', 'reserved'].includes(allocation.status) && Number(allocation.amount_paid) <= 0
             const propertyImage = propertyImageUrl(allocation.property)

             return (
               <article key={allocation.id} className="w-full overflow-hidden rounded-lg border border-line bg-white p-3 shadow-sm">
                 <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3">
                   <img src={propertyImage} alt={allocation.property?.title || 'Property'} className="h-20 w-20 rounded-md object-cover" onError={(e) => { e.target.src = '/assets/property-placeholder.svg' }} />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-ink">
                      {allocation.property?.title || 'Property'}
                    </h3>
                    <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted">
                      <MapPin size={13} className="shrink-0" />
                      <span className="min-w-0 truncate">{allocation.property?.location || 'No location'}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={allocation.status} />
                      <span className="min-w-0 max-w-full truncate rounded-md bg-canvas px-2 py-1 text-xs font-medium capitalize text-muted">
                        {allocation.payment_plan}
                      </span>
                      <span className="min-w-0 max-w-full truncate rounded-md bg-canvas px-2 py-1 text-xs font-medium text-muted">
                        {formatPaymentDuration(allocation)}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-base font-semibold text-ink">
                      {allocation.client?.full_name || 'Client'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 text-xs">
                  <div className="min-w-0 rounded-md border border-line bg-canvas px-3 py-2">
                    <p className="font-medium text-muted">Paid</p>
                    <p className="mt-1 truncate font-semibold text-ink">{formatMoney(allocation.amount_paid)}</p>
                  </div>
                  <div className="min-w-0 rounded-md border border-line bg-canvas px-3 py-2">
                    <p className="font-medium text-muted">Balance</p>
                    <p className="mt-1 truncate font-semibold text-ink">{formatMoney(allocation.balance)}</p>
                  </div>
                </div>

                <div className="mt-3 grid min-w-0 gap-2 text-xs">
                  <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-line bg-canvas px-3 py-2">
                    <span>Realtor</span>
                    <span className="min-w-0 truncate font-semibold text-ink">{realtorName(allocation)}</span>
                  </div>
                  <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-line bg-canvas px-3 py-2">
                    <span>Allocated</span>
                    <span className="min-w-0 truncate font-semibold text-ink">{allocation.allocated_at || 'No date'}</span>
                  </div>
                  <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-line bg-canvas px-3 py-2">
                    <span>Duration</span>
                    <span className="min-w-0 truncate font-semibold text-ink">{formatPaymentDuration(allocation)}</span>
                  </div>
                  <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-line bg-canvas px-3 py-2">
                    <span>Receipt</span>
                    <span className="min-w-0 truncate font-semibold text-ink">
                      {receipt?.receipt_number || 'No receipt'}
                    </span>
                  </div>
                </div>

                <div className={`mt-3 grid gap-2 border-t border-line pt-3 ${receiptAvailable ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {receiptAvailable ? (
                    <button
                      type="button"
                      onClick={() => viewReceiptDocument(allocation)}
                      className="inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-md border border-brand/20 bg-brand/5 px-3 text-xs font-semibold text-brand hover:bg-brand/10"
                      aria-label="View receipt"
                    >
                      <Eye size={14} />
                      View
                    </button>
                  ) : null}
                  {isAdmin ? (
                    <Link
                      to="/documents"
                      className="inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-md border border-line px-3 text-xs font-semibold text-ink hover:bg-canvas"
                      aria-label="Manage documents"
                    >
                      <FileText size={14} />
                      Docs
                    </Link>
                  ) : null}
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => { setEditAllocationError(''); setEditAllocation(allocation) }}
                      className="inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-md border border-line px-3 text-xs font-semibold text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={!canEdit}
                      aria-label="Edit allocation"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>
                  ) : null}
                  {isAdminAuthorizedToCancel ? (
                    <button
                      type="button"
                      onClick={() => cancelAllocation(allocation)}
                      disabled={!canCancel}
                      className="inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Cancel allocation"
                    >
                      <Trash2 size={14} />
                      Cancel
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })}

          {!loading && allocations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line bg-canvas px-4 py-10 text-center text-sm text-muted">
              No allocations found.
            </div>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Realtor</th>
                <th className="px-4 py-3 font-semibold">Property</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Paid</th>
                <th className="px-4 py-3 font-semibold">Balance</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Receipt</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((allocation) => (
                <tr key={allocation.id} className="border-b border-line/80 transition hover:bg-brand/5">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">
                      {allocation.client?.full_name || 'Client'}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {allocation.allocated_at || 'No date'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {realtorName(allocation)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">
                      {allocation.property?.title || 'Property'}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {allocation.property?.location || 'No location'}
                    </p>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted">
                    <p>{allocation.payment_plan}</p>
                    <p className="mt-1 text-xs normal-case text-muted">{formatPaymentDuration(allocation)}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">
                    {formatMoney(allocation.amount_paid)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">
                    {formatMoney(allocation.balance)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={allocation.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {hasReceipt(allocation) ? (
                      <span className="inline-flex items-center gap-2">
                        <ReceiptText size={15} />
                        {allocationReceipt(allocation).receipt_number}
                      </span>
                    ) : (
                      <span className="text-xs font-medium uppercase tracking-wide text-muted">No receipt</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {hasReceipt(allocation) ? (
                        <button
                          type="button"
                          onClick={() => viewReceiptDocument(allocation)}
                          className="rounded-md border border-brand/20 bg-brand/5 p-2 text-brand hover:bg-brand/10"
                          aria-label="View receipt"
                        >
                          <Eye size={16} />
                        </button>
                      ) : null}
                      {isAdmin ? (
                        <Link
                          to="/documents"
                          className="rounded-md border border-line p-2 text-muted hover:bg-canvas hover:text-ink"
                          aria-label="Manage documents"
                        >
                          <FileText size={16} />
                        </Link>
                      ) : null}
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => { setEditAllocationError(''); setEditAllocation(allocation) }}
                          className="rounded-md border border-line p-2 text-muted hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={allocation.status === 'cancelled' || allocation.status === 'completed'}
                          aria-label="Edit allocation"
                        >
                          <Edit3 size={16} />
                        </button>
                      ) : null}
                      {isAdminAuthorizedToCancel ? (
                        <button
                          type="button"
                          onClick={() => cancelAllocation(allocation)}
                          disabled={
                            !['active', 'reserved'].includes(allocation.status) ||
                            Number(allocation.amount_paid) > 0
                          }
                          className="rounded-md border border-line p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Cancel allocation"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && allocations.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-muted" colSpan="9">
                    No allocations found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 border-t border-line px-4 py-6 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" />
            Loading allocations
          </div>
            ) : null}
          </section>

      {modalOpen ? (
        <AllocationModal
          clients={clients}
          properties={availableProperties}
          realtors={realtors}
          submitting={submitting}
          error={allocationFormError}
          onClose={() => { setModalOpen(false); setAllocationFormError('') }}
          onSubmit={handleSubmit}
          onQuickCreate={(type) => {
            setQuickError('')
            setQuickCreateType(type)
          }}
          quickSelection={quickCreateSelection}
        />
      ) : null}

      {quickCreateType ? (
        <QuickCreateModal
          key={quickCreateType}
          type={quickCreateType}
          submitting={quickSubmitting}
          error={quickError}
          onClose={() => setQuickCreateType(null)}
          onSubmit={handleQuickCreate}
        />
      ) : null}

      {editAllocation ? (
        <EditAllocationModal
          allocation={editAllocation}
          submitting={submitting}
          error={editAllocationError}
          onClose={() => { setEditAllocation(null); setEditAllocationError('') }}
          onSubmit={(payload) => handleAllocationUpdate(editAllocation, payload)}
        />
      ) : null}

      {(receiptDocument || documentLoading || documentError) ? (
        <ReceiptDocumentModal
          receiptDocument={receiptDocument}
          loading={documentLoading}
          error={documentError}
          onClose={closeReceiptDocument}
          receiptHistory={receiptHistory}
          activeReceiptIndex={activeReceiptIndex}
          onNavigateReceipt={navigateReceipt}
        />
      ) : null}
    </div>
  )
}
