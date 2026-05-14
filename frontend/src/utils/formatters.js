export const moneyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
})

export function formatMoney(value) {
  return moneyFormatter.format(Number(value || 0))
}
