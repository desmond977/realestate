export const paymentDurationOptions = [
  { value: 'one_time', label: 'One-time Payment' },
  { value: '1_week', label: '1 Week' },
  { value: '2_weeks', label: '2 Weeks' },
  { value: '3_weeks', label: '3 Weeks' },
  { value: '1_month', label: '1 Month' },
  { value: '2_months', label: '2 Months' },
  { value: '3_months', label: '3 Months' },
  { value: '4_months', label: '4 Months' },
  { value: '5_months', label: '5 Months' },
  { value: '6_months', label: '6 Months' },
  { value: '12_months', label: '12 Months (1 Year)' },
  { value: 'custom', label: 'Custom' },
]

export const customDurationUnits = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
]

export function formatPaymentDuration(allocation) {
  if (!allocation) return 'One-time Payment'

  if (allocation.payment_duration_label) {
    return allocation.payment_duration_label
  }

  if (allocation.payment_duration === 'custom') {
    const value = allocation.custom_duration_value
    const unit = allocation.custom_duration_unit

    return value && unit ? `${value} ${String(unit).replaceAll('_', ' ')}` : 'Custom'
  }

  return paymentDurationOptions.find((option) => option.value === allocation.payment_duration)?.label || 'One-time Payment'
}
