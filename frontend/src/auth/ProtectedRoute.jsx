import { Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function ProtectedRoute({ roles = [] }) {
  const location = useLocation()
  const outletContext = useOutletContext()
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-4 text-sm font-medium text-muted">
        Loading...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet context={outletContext} />
}
