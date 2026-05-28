export function canViewProperties(user) {
  return ['admin', 'accountant'].includes(user?.role)
}

export function canManageProperties(user) {
  return user?.role === 'admin'
}

export function canDeleteClients(user) {
  return user?.role === 'admin'
}

export function canDeleteRealtors(user) {
  return user?.role === 'admin'
}

export function canCancelAllocations(user) {
  return user?.role === 'admin'
}
