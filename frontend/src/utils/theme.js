export const SETTINGS_KEY = 'estateops_dashboard_settings'
export const USER_THEME_KEY = 'estateops_user_theme_mode'

export const DEFAULT_BRANDING = {
  brand_color: '#166534',
}

export const DEFAULT_USER_THEME = {
  theme_mode: 'light',
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

export function getPersistedUserTheme() {
  try {
    const raw = localStorage.getItem(USER_THEME_KEY)
    if (!raw) {
      return DEFAULT_USER_THEME
    }

    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_USER_THEME,
      ...parsed,
    }
  } catch {
    return DEFAULT_USER_THEME
  }
}

export function persistUserTheme(userTheme) {
  localStorage.setItem(USER_THEME_KEY, JSON.stringify({
    ...DEFAULT_USER_THEME,
    ...userTheme,
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

export function applyBranding({ theme_mode, brand_color }) {
  const resolvedThemeMode = ['light', 'dark'].includes(theme_mode)
    ? theme_mode
    : DEFAULT_USER_THEME.theme_mode

  const resolvedBrandColor = typeof brand_color === 'string' && brand_color
    ? brand_color
    : DEFAULT_BRANDING.brand_color

  document.documentElement.dataset.theme = resolvedThemeMode
  document.documentElement.style.setProperty('--color-brand', resolvedBrandColor)
  document.documentElement.style.setProperty('--color-brand-dark', darkenHex(resolvedBrandColor, 0.2))
}
