import {
  Building2,
  Gauge,
  LogOut,
  Menu,
  ReceiptText,
  Scale,
  User,
  WalletCards,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useClient } from '../../context/ClientContext'
import { ClientBrandLogo } from './ClientBrandLogo'

const navItems = [
  { label: 'Dashboard', to: '/client/dashboard', icon: Gauge },
  { label: 'My Properties', to: '/client/properties', icon: Building2 },
  { label: 'Payments', to: '/client/payments', icon: WalletCards },
  { label: 'Balances', to: '/client/balances', icon: Scale },
  { label: 'Receipts', to: '/client/receipts', icon: ReceiptText },
]

export function ClientLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { logout, user } = useClient()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/client/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f6f7f4] text-ink">
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-line bg-white transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-line px-5">
          <div className="flex items-center gap-3">
            <ClientBrandLogo
              imageClassName="h-12 max-w-36 object-contain"
              fallbackClassName="grid h-12 w-12 place-items-center rounded-md bg-brand text-sm font-bold text-white"
            />
            <span className="sr-only">Client Portal</span>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-muted hover:bg-canvas lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition ${
                  isActive ? 'bg-brand text-white shadow-sm' : 'text-muted hover:bg-canvas hover:text-ink'
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line p-4">
          <NavLink
            to="/client/profile"
            className={({ isActive }) =>
              `mb-3 flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition ${
                isActive ? 'bg-brand text-white shadow-sm' : 'text-muted hover:bg-canvas hover:text-ink'
              }`
            }
            onClick={() => setSidebarOpen(false)}
          >
            <User size={18} />
            Profile
          </NavLink>
          <div className="mb-3 rounded-lg border border-line bg-[#f8faf7] p-3">
            <p className="truncate text-sm font-semibold">{user?.name || 'Client'}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium text-muted hover:bg-canvas hover:text-ink"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-20 bg-ink/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur md:px-6">
          <button
            type="button"
            className="rounded-md border border-line p-2 text-muted hover:bg-canvas lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted">Signed in as</p>
            <p className="text-sm font-semibold">{user?.name || 'Client'}</p>
          </div>
        </header>

        <main className="px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
