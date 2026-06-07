import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { applyBranding } from '../utils/theme'
import { AuthContext } from './AuthContext'

function readStoredUser() {
  const rawUser = localStorage.getItem('auth_user')

  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser)
  } catch {
    localStorage.removeItem('auth_user')
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'))
  const [user, setUser] = useState(readStoredUser)
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    let active = true

    async function hydrate() {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const response = await api.get('/auth/me')
        const nextUser = response.data.data.user

        if (active) {
          localStorage.setItem('auth_user', JSON.stringify(nextUser))
          setUser(nextUser)
        }
      } catch {
        if (active) {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
          setToken(null)
          setUser(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    hydrate()

    return () => {
      active = false
    }
  }, [token])

  useEffect(() => {
    function handleAuthCleared(event) {
      if (event.detail?.scope !== 'admin') return

      setToken(null)
      setUser(null)
      setLoading(false)
    }

    window.addEventListener('auth:cleared', handleAuthCleared)

    return () => window.removeEventListener('auth:cleared', handleAuthCleared)
  }, [])

  async function login(credentials) {
    const response = await api.post('/auth/login', {
      ...credentials,
      device_name: 'real-estate-dashboard',
    })

    const nextToken = response.data.data.token
    const nextUser = response.data.data.user

    localStorage.setItem('auth_token', nextToken)
    localStorage.setItem('auth_user', JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)

    if (nextUser.theme_mode) {
      applyBranding({ theme_mode: nextUser.theme_mode })
    }

    return nextUser
  }

  async function updateUser(profile) {
    const response = await api.patch('/auth/me', profile)
    const nextUser = response.data.data.user

    localStorage.setItem('auth_user', JSON.stringify(nextUser))
    setUser(nextUser)

    if (nextUser.theme_mode) {
      applyBranding({ theme_mode: nextUser.theme_mode })
    }

    return nextUser
  }

  async function updateTheme(themeMode) {
    const response = await api.patch('/auth/me/theme', { theme_mode: themeMode })
    const nextUser = response.data.data.user

    localStorage.setItem('auth_user', JSON.stringify(nextUser))
    setUser(nextUser)

    applyBranding({ theme_mode: themeMode })

    return nextUser
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } finally {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      setToken(null)
      setUser(null)
    }
  }

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token),
      loading,
      login,
      logout,
      updateUser,
      updateTheme,
      token,
      user,
    }),
    [loading, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}