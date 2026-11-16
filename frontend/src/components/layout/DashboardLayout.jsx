import {
  Building2,
  ChartNoAxesCombined,
  ChevronDown,
  ClipboardCheck,
  FileText,
  Gauge,
  Home,
  LogOut,
  Menu,
  ReceiptText,
  KeyRound,
  Settings2,
  ShieldCheck,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { api, assetUrl } from '../../api/client'
import { applyBranding, getPersistedBranding, getPersistedUserTheme, persistBranding } from '../../utils/theme.js'

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: Gauge, roles: ['admin', 'staff', 'accountant'] },
  { label: 'Properties', to: '/properties', icon: Building2, roles: ['admin', 'staff', 'accountant'] },
  { label: 'Realtors', to: '/realtors', icon: UserPlus, roles: ['admin', 'staff', 'accountant'] },
  { label: 'Clients', to: '/clients', icon: Users, roles: ['admin', 'staff', 'accountant'] },
  { label: 'Allocations', to: '/allocations', icon: Home, roles: ['admin', 'staff', 'accountant'] },
  { label: 'Documents', to: '/documents', icon: FileText, roles: ['admin', 'staff', 'accountant'] },
  { label: 'Receipts', to: '/receipts', icon: ReceiptText, roles: ['admin', 'staff', 'accountant'] },
  { label: 'Users', to: '/users', icon: ShieldCheck, roles: ['admin'] },
]

const rentalNavItems = [
  { label: 'Rental Dashboard', to: '/rental-dashboard', icon: ChartNoAxesCombined, roles: ['admin', 'staff', 'accountant'] },
  { label: 'Tenants & Allocations', to: '/rentals', icon: KeyRound, roles: ['admin', 'staff', 'accountant'] },
  { label: 'Rent Payments', to: '/rental-payments', icon: ReceiptText, roles: ['admin', 'staff', 'accountant'] },
  { label: 'Service Charges', to: '/service-charges', icon: ReceiptText, roles: ['admin', 'staff', 'accountant'] },
  { label: 'Payment Approvals', to: '/payment-approvals', icon: ClipboardCheck, roles: ['admin'] },
]

const utilityNavItems = [
  { label: 'Profile', to: '/profile', icon: User, roles: ['admin', 'staff', 'accountant'] },
  { label: 'Settings', to: '/settings', icon: Settings2, roles: ['admin'] },
]

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rentalMenuOpen, setRentalMenuOpen] = useState(false)
  const { logout, user } = useAuth()
  const location = useLocation()
  const [branding, setBranding] = useState(() => getPersistedBranding())
  const [rentalManagementEnabled, setRentalManagementEnabled] = useState(null)
  const [rentalSettingsLoaded, setRentalSettingsLoaded] = useState(false)
  const [realEstateManagementEnabled, setRealEstateManagementEnabled] = useState(null)

  useEffect(() => {
    let active = true

    async function loadSettings() {
      try {
        const response = await api.get('/settings/company')

        if (active) {
          setBranding(response.data.data.settings)
          setRentalManagementEnabled(Boolean(response.data.data.settings.rental_management_enabled))
          setRealEstateManagementEnabled(Boolean(response.data.data.settings.real_estate_management_enabled))
          setRentalSettingsLoaded(true)
          persistBranding(response.data.data.settings)
          applyBranding({ ...getPersistedUserTheme(), brand_color: response.data.data.settings.brand_color })
        }
      } catch {
        if (active) {
          const persisted = getPersistedBranding()
          setBranding(persisted)
          setRentalManagementEnabled(false)
          setRealEstateManagementEnabled(false)
          setRentalSettingsLoaded(true)
          applyBranding({ ...getPersistedUserTheme(), ...persisted })
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

  useEffect(() => {
    if (location.pathname.startsWith('/rental-') || location.pathname.startsWith('/rentals') || location.pathname.startsWith('/service-charges') || location.pathname === '/payment-approvals') {
      setRentalMenuOpen(true)
    }
  }, [location.pathname])

  const visibleNavItems = realEstateManagementEnabled
    ? navItems.filter((item) => item.roles.includes(user?.role))
    : []
  const visibleRentalNavItems = rentalManagementEnabled
    ? rentalNavItems.filter((item) => item.roles.includes(user?.role))
    : []
  const visibleUtilityItems = utilityNavItems.filter((item) => item.roles.includes(user?.role))

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-line/80 bg-panel shadow-xl shadow-ink/[0.04] transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
          <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-line/80 px-5">
          <div className="flex items-center">
            {branding?.company_logo ? (
              <img src={assetUrl(branding.company_logo)} alt={branding.company_name || 'Logo'} className="h-12 w-[100px] rounded-sm object-contain" />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-brand text-white">
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

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/75">Workspace</p>
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
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
          {visibleRentalNavItems.length > 0 ? (
            <div>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-all duration-150 hover:bg-canvas hover:text-ink"
                aria-expanded={rentalMenuOpen}
                onClick={() => setRentalMenuOpen((open) => !open)}
              >
                <span className="flex items-center gap-3"><KeyRound size={18} />Rental Management</span>
                <ChevronDown size={16} className={rentalMenuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {rentalMenuOpen ? (
                <div className="ml-4 mt-1 space-y-1 border-l border-line pl-3">
                  {visibleRentalNavItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
                          isActive ? 'bg-brand text-white' : 'text-muted hover:bg-canvas hover:text-ink'
                        }`
                      }
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon size={17} />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
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
        <header className="sticky top-0 z-10 flex h-[76px] items-center justify-between border-b border-line/80 bg-panel/90 px-4 shadow-sm shadow-ink/[0.02] backdrop-blur-xl md:px-7">
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
              <p className="hidden text-sm text-muted sm:block">Signed in as</p>
              <h1 className="max-w-[42vw] truncate text-sm font-semibold text-ink sm:max-w-none sm:text-base">{user?.name}</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Logout"
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-line p-2.5 text-sm font-medium text-muted hover:bg-canvas hover:text-ink sm:px-3 sm:py-2"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1680px] px-3 py-5 sm:px-5 sm:py-7 md:px-7 lg:px-9">
          <Outlet context={{ rentalManagementEnabled, rentalSettingsLoaded, realEstateManagementEnabled, realEstateSettingsLoaded: realEstateManagementEnabled !== null }} />
          <footer className="mt-6 rounded-2xl border border-line bg-panel/90 p-3 text-sm text-muted shadow-sm sm:mt-10 sm:rounded-3xl sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="hidden sm:block">
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
                {realEstateManagementEnabled ? (
                  <NavLink
                    to="/realtors"
                    className="rounded-full border border-line bg-canvas px-3 py-2 text-sm text-ink hover:bg-brand/5"
                  >
                    Realtors
                  </NavLink>
                ) : null}
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
