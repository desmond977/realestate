export function canViewProperties(user) {
  return ['admin', 'staff', 'accountant'].includes(user?.role)
}

export function canManageProperties(user) {
  return user?.role === 'admin'
}

export function canManageAllocations(user) {
  return user?.role === 'admin'
}

export function canManageRealtors(user) {
  return ['admin', 'staff'].includes(user?.role)
}

export function canManageClients(user) {
  return ['admin', 'staff'].includes(user?.role)
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
