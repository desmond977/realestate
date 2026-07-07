import { useCallback, useEffect, useMemo, useState } from 'react'
import { clientAuthApi } from '../services/clientApi'
import { ClientContext } from './ClientContext'

function readStoredUser() {
  const rawUser = localStorage.getItem('client_auth_user')

  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser)
  } catch {
    localStorage.removeItem('client_auth_user')
    return null
  }
}

export function ClientProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('client_auth_token'))
  const [user, setUser] = useState(readStoredUser)
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    function handleAuthCleared(event) {
      if (event.detail?.scope !== 'client') return

      setToken(null)
      setUser(null)
      setLoading(false)
    }

    window.addEventListener('auth:cleared', handleAuthCleared)

    return () => window.removeEventListener('auth:cleared', handleAuthCleared)
  }, [])

  useEffect(() => {
    let active = true

    async function hydrate() {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const response = await clientAuthApi.profile()

        if (active) {
          localStorage.setItem('client_auth_user', JSON.stringify(response.data))
          setUser(response.data)
        }
      } catch {
        if (active) {
          localStorage.removeItem('client_auth_token')
          localStorage.removeItem('client_auth_user')
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

  const login = useCallback(async (credentials) => {
    try {
      const response = await clientAuthApi.login(credentials)
      const nextToken = response.data.token
      const nextUser = response.data.user

      localStorage.setItem('client_auth_token', nextToken)
      localStorage.setItem('client_auth_user', JSON.stringify(nextUser))
      setToken(nextToken)
      setUser(nextUser)

      return { success: true, user: nextUser }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.response?.data?.errors?.email?.[0] ||
          'Unable to sign in.',
      }
    }
  }, [])

  const register = useCallback(async (payload) => {
    try {
      const response = await clientAuthApi.register(payload)
      const nextToken = response.data.token
      const nextUser = response.data.user

      localStorage.setItem('client_auth_token', nextToken)
      localStorage.setItem('client_auth_user', JSON.stringify(nextUser))
      setToken(nextToken)
      setUser(nextUser)

      return { success: true, user: nextUser }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          Object.values(error.response?.data?.errors || {})?.[0]?.[0] ||
          'Unable to create account.',
      }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await clientAuthApi.logout()
    } finally {
      localStorage.removeItem('client_auth_token')
      localStorage.removeItem('client_auth_user')
      setToken(null)
      setUser(null)
    }
  }, [])

  const updateUser = useCallback((profile) => {
    const nextUser = { ...user, ...profile }
    localStorage.setItem('client_auth_user', JSON.stringify(nextUser))
    setUser(nextUser)
  }, [user])

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token),
      loading,
      login,
      logout,
      register,
      token,
      updateUser,
      user,
    }),
    [loading, login, logout, register, token, updateUser, user],
  )

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
}
