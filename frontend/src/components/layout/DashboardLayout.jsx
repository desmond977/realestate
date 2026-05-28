import {
  Building2,
  Gauge,
  Home,
  LogOut,
  Menu,
  ReceiptText,
  Settings2,
  ShieldCheck,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { api } from '../../api/client'

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: Gauge, roles: ['admin', 'staff', 'accountant'] },
  { label: 'Properties', to: '/properties', icon: Building2, roles: ['admin', 'accountant'] },
  { label: 'Realtors', to: '/realtors', icon: UserPlus, roles: ['admin', 'staff', 'accountant'] },
  { label: 'Clients', to: '/clients', icon: Users, roles: ['admin', 'staff'] },
  { label: 'Allocations', to: '/allocations', icon: Home, roles: ['admin', 'staff', 'accountant'] },
  { label: 'Receipts', to: '/receipts', icon: ReceiptText, roles: ['admin', 'accountant'] },
  { label: 'Users', to: '/users', icon: ShieldCheck, roles: ['admin'] },
]

const utilityNavItems = [
  { label: 'Profile', to: '/profile', icon: User, roles: ['admin', 'staff', 'accountant'] },
  { label: 'Settings', to: '/settings', icon: Settings2, roles: ['admin'] },
]

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { logout, user } = useAuth()
  const [branding, setBranding] = useState({})

  useEffect(() => {
    let active = true

    async function loadSettings() {
      try {
        const response = await api.get('/settings/company')

        if (active) {
          setBranding(response.data.data.settings)
        }
      } catch {
        if (active) {
          setBranding({})
        }
      }
    }

    function onSettings() {
      loadSettings()
    }

    loadSettings()
    window.addEventListener('estateopsSettingsUpdated', onSettings)
    return () => {
      active = false
      window.removeEventListener('estateopsSettingsUpdated', onSettings)
    }
  }, [])

  const visibleNavItems = navItems.filter((item) => item.roles.includes(user?.role))
  const visibleUtilityItems = utilityNavItems.filter((item) => item.roles.includes(user?.role))

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-line bg-panel transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
          <div className="flex items-center">
            {branding?.company_logo ? (
              <img src={branding.company_logo} alt={branding.company_name || 'Logo'} className="h-24 w-24 rounded-sm object-contain" />
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded-lg bg-brand text-white">
                <svg viewBox="0 0 24 24" fill="none" width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path d="M3 21V9a2 2 0 0 1 2-2h3v10H3zM14 7h5a2 2 0 0 1 2 2v12H14V7zM8 3h8v4H8V3z" fill="currentColor"/></svg>
              </div>
            )}
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

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleNavItems.map((item) => (
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

        <div className="shrink-0 border-t border-line bg-panel px-3 py-4">
          <div className="mb-3 rounded-lg border border-line bg-canvas p-3">
            <p className="text-xs font-medium text-muted">Signed in</p>
            <p className="mt-1 truncate text-sm font-semibold text-ink">{user?.name || 'User'}</p>
            <p className="mt-1 text-xs capitalize text-muted">{user?.role || 'staff'}</p>
          </div>

          <nav className="space-y-1">
            {visibleUtilityItems.map((item) => (
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
        </div>
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
          <footer className="mt-10 rounded-3xl border border-line bg-panel/90 p-5 text-sm text-muted shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Quick access: manage admin settings or track realtor clients and referrals.
              </p>
              <div className="flex flex-wrap gap-2">
                <NavLink
                  to="/profile"
                  className="rounded-full border border-line bg-canvas px-3 py-2 text-sm text-ink hover:bg-brand/5"
                >
                  Profile
                </NavLink>
                {user?.role === 'admin' ? (
                  <NavLink
                    to="/settings"
                    className="rounded-full border border-line bg-canvas px-3 py-2 text-sm text-ink hover:bg-brand/5"
                  >
                    Settings
                  </NavLink>
                ) : null}
                <NavLink
                  to="/realtors"
                  className="rounded-full border border-line bg-canvas px-3 py-2 text-sm text-ink hover:bg-brand/5"
                >
                  Realtors
                </NavLink>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
