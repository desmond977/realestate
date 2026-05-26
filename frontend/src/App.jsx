import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute.jsx'
import { DashboardLayout } from './components/layout/DashboardLayout.jsx'
import { AllocationsPage } from './pages/AllocationsPage.jsx'
import { ClientsPage } from './pages/ClientsPage.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { PaymentsPage } from './pages/PaymentsPage.jsx'
import { PropertiesPage } from './pages/PropertiesPage.jsx'
import { ProfilePage } from './pages/ProfilePage.jsx'
import { ReceiptsPage } from './pages/ReceiptsPage.jsx'
import { RealtorsPage } from './pages/RealtorsPage.jsx'
import { SettingsPage } from './pages/SettingsPage.jsx'
import { UsersPage } from './pages/UsersPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
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
            <Route path="/properties" element={<PropertiesPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['admin', 'accountant']} />}>
            <Route path="/payments" element={<PaymentsPage />} />
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
