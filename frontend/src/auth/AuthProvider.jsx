import { useMemo, useState } from 'react'
import { api } from '../api/client'
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

  async function updateUser(profile) {
    const response = await api.patch('/auth/me', profile)
    const nextUser = response.data.data.user

    localStorage.setItem('auth_user', JSON.stringify(nextUser))
    setUser(nextUser)

    return nextUser
  }

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token),
      login,
      logout,
      updateUser,
      token,
      user,
    }),
    [token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
