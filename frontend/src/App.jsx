import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute.jsx'
import { DashboardLayout } from './components/layout/DashboardLayout.jsx'
import { AllocationsPage } from './pages/AllocationsPage.jsx'
import { ClientsPage } from './pages/ClientsPage.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { PaymentsPage } from './pages/PaymentsPage.jsx'
import { PropertiesPage } from './pages/PropertiesPage.jsx'
import { ReceiptsPage } from './pages/ReceiptsPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/allocations" element={<AllocationsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="/receipts" element={<ReceiptsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
