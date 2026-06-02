import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute.jsx'

const lazyNamed = (loader, exportName) =>
  lazy(() => loader().then((module) => ({ default: module[exportName] })))

const ProtectedClientRoute = lazy(() => import('./components/client/ProtectedClientRoute.jsx'))
const ClientLayout = lazyNamed(() => import('./components/client/ClientLayout.jsx'), 'ClientLayout')
const DashboardLayout = lazyNamed(() => import('./components/layout/DashboardLayout.jsx'), 'DashboardLayout')
const AllocationsPage = lazyNamed(() => import('./pages/AllocationsPage.jsx'), 'AllocationsPage')
const ClientsPage = lazyNamed(() => import('./pages/ClientsPage.jsx'), 'ClientsPage')
const DashboardPage = lazyNamed(() => import('./pages/DashboardPage.jsx'), 'DashboardPage')
const LoginPage = lazyNamed(() => import('./pages/LoginPage.jsx'), 'LoginPage')
const PropertiesPage = lazyNamed(() => import('./pages/PropertiesPage.jsx'), 'PropertiesPage')
const ProfilePage = lazyNamed(() => import('./pages/ProfilePage.jsx'), 'ProfilePage')
const ReceiptsPage = lazyNamed(() => import('./pages/ReceiptsPage.jsx'), 'ReceiptsPage')
const RealtorsPage = lazyNamed(() => import('./pages/RealtorsPage.jsx'), 'RealtorsPage')
const SettingsPage = lazyNamed(() => import('./pages/SettingsPage.jsx'), 'SettingsPage')
const UsersPage = lazyNamed(() => import('./pages/UsersPage.jsx'), 'UsersPage')
const ClientDashboardPage = lazyNamed(() => import('./pages/client/ClientDashboardPage.jsx'), 'ClientDashboardPage')
const ClientBalancesPage = lazyNamed(() => import('./pages/client/ClientBalancesPage.jsx'), 'ClientBalancesPage')
const ClientLoginPage = lazy(() => import('./pages/client/ClientLoginPage.jsx'))
const ClientPaymentsPage = lazyNamed(() => import('./pages/client/ClientPaymentsPage.jsx'), 'ClientPaymentsPage')
const ClientProfilePage = lazy(() => import('./pages/client/ClientProfilePage.jsx'))
const ClientPropertiesPage = lazyNamed(() => import('./pages/client/ClientPropertiesPage.jsx'), 'ClientPropertiesPage')
const ClientReceiptsPage = lazyNamed(() => import('./pages/client/ClientReceiptsPage.jsx'), 'ClientReceiptsPage')
const ClientRegisterPage = lazy(() => import('./pages/client/ClientRegisterPage.jsx'))

function RouteFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4 text-sm font-medium text-muted">
      Loading...
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/client/login" element={<ClientLoginPage />} />
        <Route path="/client/register" element={<ClientRegisterPage />} />
        <Route
          path="/client"
          element={
            <ProtectedClientRoute>
              <ClientLayout />
            </ProtectedClientRoute>
          }
        >
          <Route index element={<Navigate to="/client/dashboard" replace />} />
          <Route path="dashboard" element={<ClientDashboardPage />} />
          <Route path="properties" element={<ClientPropertiesPage />} />
          <Route path="payments" element={<ClientPaymentsPage />} />
          <Route path="balances" element={<ClientBalancesPage />} />
          <Route path="receipts" element={<ClientReceiptsPage />} />
          <Route path="profile" element={<ClientProfilePage />} />
          <Route path="*" element={<Navigate to="/client/dashboard" replace />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/realtors" element={<RealtorsPage />} />
            <Route element={<ProtectedRoute roles={['admin', 'staff', 'accountant']} />}>
              <Route path="/allocations" element={<AllocationsPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={['admin', 'staff']} />}>
              <Route path="/clients" element={<ClientsPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={['admin', 'accountant']} />}>
              <Route path="/properties" element={<PropertiesPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={['admin', 'accountant']} />}>
              <Route path="/receipts" element={<ReceiptsPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
