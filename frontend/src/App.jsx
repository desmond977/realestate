import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute.jsx'
import { ClientLayout } from './components/client/ClientLayout.jsx'
import ProtectedClientRoute from './components/client/ProtectedClientRoute.jsx'
import { DashboardLayout } from './components/layout/DashboardLayout.jsx'
import { AllocationsPage } from './pages/AllocationsPage.jsx'
import { ClientsPage } from './pages/ClientsPage.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { PropertiesPage } from './pages/PropertiesPage.jsx'
import { ProfilePage } from './pages/ProfilePage.jsx'
import { ReceiptsPage } from './pages/ReceiptsPage.jsx'
import { RealtorsPage } from './pages/RealtorsPage.jsx'
import { SettingsPage } from './pages/SettingsPage.jsx'
import { UsersPage } from './pages/UsersPage.jsx'
import { ClientDashboardPage } from './pages/client/ClientDashboardPage.jsx'
import ClientLoginPage from './pages/client/ClientLoginPage.jsx'
import ClientProfilePage from './pages/client/ClientProfilePage.jsx'
import { ClientPropertiesPage } from './pages/client/ClientPropertiesPage.jsx'
import { ClientReceiptsPage } from './pages/client/ClientReceiptsPage.jsx'
import ClientRegisterPage from './pages/client/ClientRegisterPage.jsx'

function App() {
  return (
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
  )
}

export default App
