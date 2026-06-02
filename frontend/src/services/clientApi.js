import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'

export const clientApi = axios.create({
  baseURL: `${API_BASE_URL}/client`,
  headers: {
    Accept: 'application/json',
  },
})

clientApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('client_auth_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

clientApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('client_auth_token')
      localStorage.removeItem('client_auth_user')
    }

    return Promise.reject(error)
  },
)

export const clientAuthApi = {
  login: (payload) => clientApi.post('/auth/login', payload),
  register: (payload) => clientApi.post('/auth/register', payload),
  logout: () => clientApi.post('/auth/logout'),
  profile: () => clientApi.get('/auth/profile'),
}

export const clientBrandingApi = {
  get: () => clientApi.get('/branding'),
}

export const dashboardApi = {
  getDashboard: () => clientApi.get('/dashboard'),
  getSummary: () => clientApi.get('/dashboard/summary'),
}

export const propertiesApi = {
  list: () => clientApi.get('/properties'),
  show: (allocationId) => clientApi.get(`/properties/${allocationId}`),
}

export const paymentsApi = {
  list: () => clientApi.get('/payments'),
  show: (paymentId) => clientApi.get(`/payments/${paymentId}`),
}

export const receiptsApi = {
  list: () => clientApi.get('/receipts'),
  show: (receiptId) => clientApi.get(`/receipts/${receiptId}`),
  document: (receiptId) => clientApi.get(`/receipts/${receiptId}/document`),
  downloadUrl: (receiptId) => `${API_BASE_URL}/client/receipts/${receiptId}/download`,
}

export const balancesApi = {
  list: () => clientApi.get('/balances'),
  summary: () => clientApi.get('/balances/summary'),
}

export const profileApi = {
  getProfile: () => clientApi.get('/profile'),
  updateProfile: (payload) => clientApi.put('/profile', payload),
  updatePassword: (payload) => clientApi.put('/profile/password', payload),
  updateProfileImage: (payload) =>
    clientApi.post('/profile/image', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteProfileImage: () => clientApi.delete('/profile/image'),
}

export function clientDownloadHeaders() {
  const token = localStorage.getItem('client_auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}
