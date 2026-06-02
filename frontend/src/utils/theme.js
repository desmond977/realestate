export const SETTINGS_KEY = 'estateops_dashboard_settings'

export const DEFAULT_BRANDING = {
  theme_mode: 'system',
  brand_color: '#166534',
}

export function getPersistedBranding() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) {
      return DEFAULT_BRANDING
    }

    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_BRANDING,
      ...parsed,
    }
  } catch {
    return DEFAULT_BRANDING
  }
}

export function persistBranding(branding) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    ...DEFAULT_BRANDING,
    ...branding,
  }))
}

function normalizeHex(color) {
  if (typeof color !== 'string') {
    return '#166534'
  }

  let hex = color.trim()
  if (hex[0] === '#') {
    hex = hex.slice(1)
  }

  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((segment) => segment + segment)
      .join('')
  }

  if (!/^([A-Fa-f0-9]{6})$/.test(hex)) {
    return '166534'
  }

  return hex.toLowerCase()
}

function darkenHex(color, amount) {
  const hex = normalizeHex(color)
  const red = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) - Math.round(255 * amount)))
  const green = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) - Math.round(255 * amount)))
  const blue = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) - Math.round(255 * amount)))

  const toHex = (value) => value.toString(16).padStart(2, '0')
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`
}

export function applyBranding(branding) {
  const themeMode = ['light', 'dark', 'system'].includes(branding?.theme_mode)
    ? branding.theme_mode
    : DEFAULT_BRANDING.theme_mode

  const brandColor = typeof branding?.brand_color === 'string' && branding.brand_color
    ? branding.brand_color
    : DEFAULT_BRANDING.brand_color

  document.documentElement.dataset.theme = themeMode
  document.documentElement.style.setProperty('--color-brand', brandColor)
  document.documentElement.style.setProperty('--color-brand-dark', darkenHex(brandColor, 0.2))
}
