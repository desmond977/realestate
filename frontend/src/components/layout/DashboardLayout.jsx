import {
  Building2,
  CreditCard,
  Gauge,
  Home,
  LogOut,
  Menu,
  ReceiptText,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: Gauge },
  { label: 'Properties', to: '/properties', icon: Building2 },
  { label: 'Clients', to: '/clients', icon: Users },
  { label: 'Allocations', to: '/allocations', icon: Home },
  { label: 'Payments', to: '/payments', icon: CreditCard },
  { label: 'Receipts', to: '/receipts', icon: ReceiptText },
]

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { logout, user } = useAuth()

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 border-r border-line bg-panel transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">
              EstateOps
            </p>
            <p className="text-xs text-muted">Management Console</p>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-muted hover:bg-canvas lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand text-white'
                    : 'text-muted hover:bg-canvas hover:text-ink'
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-20 bg-ink/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-panel/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md border border-line p-2 text-muted hover:bg-canvas lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-sm text-muted">Signed in as</p>
              <h1 className="text-base font-semibold text-ink">{user?.name}</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium text-muted hover:bg-canvas hover:text-ink"
          >
            <LogOut size={16} />
            Logout
          </button>
        </header>

        <main className="px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
