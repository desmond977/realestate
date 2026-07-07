import { api } from '../api/client'

const CLIENT_API_PREFIX = '/client'

function clientPath(path) {
  return `${CLIENT_API_PREFIX}${path}`
}

export const clientAuthApi = {
  login: (payload) => api.post(clientPath('/auth/login'), payload),
  register: (payload) => api.post(clientPath('/auth/register'), payload),
  logout: () => api.post(clientPath('/auth/logout')),
  profile: () => api.get(clientPath('/auth/profile')),
}

export const clientBrandingApi = {
  get: () => api.get(clientPath('/branding')),
}

export const dashboardApi = {
  getDashboard: () => api.get(clientPath('/dashboard')),
  getSummary: () => api.get(clientPath('/dashboard/summary')),
}

export const propertiesApi = {
  list: () => api.get(clientPath('/properties')),
  show: (allocationId) => api.get(clientPath(`/properties/${allocationId}`)),
}

export const paymentsApi = {
  list: () => api.get(clientPath('/payments')),
  show: (paymentId) => api.get(clientPath(`/payments/${paymentId}`)),
}

export const receiptsApi = {
  list: () => api.get(clientPath('/receipts')),
  show: (receiptId) => api.get(clientPath(`/receipts/${receiptId}`)),
  document: (receiptId) => api.get(clientPath(`/receipts/${receiptId}/document`)),
  download: (receiptId) =>
    api.get(clientPath(`/receipts/${receiptId}/download`), {
      responseType: 'blob',
    }),
}

export const documentsApi = {
  list: () => api.get(clientPath('/documents')),
  view: (allocationId, templateId) =>
    api.get(clientPath(`/documents/allocations/${allocationId}/templates/${templateId}/view`), {
      responseType: 'text',
    }),
}

export const balancesApi = {
  list: () => api.get(clientPath('/balances')),
  summary: () => api.get(clientPath('/balances/summary')),
}

export const profileApi = {
  getProfile: () => api.get(clientPath('/profile')),
  updateProfile: (payload) => api.put(clientPath('/profile'), payload),
  updatePassword: (payload) => api.put(clientPath('/profile/password'), payload),
  updateProfileImage: (payload) =>
    api.post(clientPath('/profile/image'), payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteProfileImage: () => api.delete(clientPath('/profile/image')),
}
