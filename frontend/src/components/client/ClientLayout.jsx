import {
  Building2,
  ChevronDown,
  FileText,
  Gauge,
  LogOut,
  Menu,
  ReceiptText,
  User,
  WalletCards,
  KeyRound,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useClient } from '../../context/ClientContext'
import { useClientBranding } from '../../hooks/useClientBranding'
import { applyBranding, getPersistedBranding, getPersistedClientTheme, getPersistedUserTheme } from '../../utils/theme'
import { ClientBrandLogo } from './ClientBrandLogo'
import { serviceChargesApi } from '../../services/clientApi'
import { formatMoney } from '../../utils/formatters'

const navItems = [
  { label: 'Dashboard', to: '/client/dashboard', icon: Gauge },
  { label: 'My Properties', to: '/client/properties', icon: Building2 },
  { label: 'Documents', to: '/client/documents', icon: FileText },
  { label: 'Receipts', to: '/client/receipts', icon: ReceiptText },
]

const rentalNavItems = [
  { label: 'Rent Payments', to: '/client/rent-payments', icon: WalletCards },
  { label: 'Service Charges', to: '/client/service-charges', icon: ReceiptText },
]

export function ClientLayout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rentalMenuOverride, setRentalMenuOverride] = useState(null)
  const { logout, user } = useClient()
  const branding = useClientBranding()
  const rentalManagementEnabled = branding?.rental_management_enabled === true
  const [unpaidCharges, setUnpaidCharges] = useState(null)
  const navigate = useNavigate()
  const isRentalPath = location.pathname.startsWith('/client/rent-payments')
    || location.pathname.startsWith('/client/service-charges')
  const rentalMenuOpen = rentalMenuOverride?.path === location.pathname
    ? rentalMenuOverride.open
    : isRentalPath

  useEffect(() => {
    applyBranding({ ...getPersistedBranding(), ...getPersistedClientTheme() })

    return () => {
      applyBranding({ ...getPersistedBranding(), ...getPersistedUserTheme() })
    }
  }, [user?.id])

  useEffect(() => {
    if (!rentalManagementEnabled || !user?.id) return

    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const noticeKey = `client_service_charge_notice_checked:v2:${user.id}:${month}`
    if (sessionStorage.getItem(noticeKey)) return

    let active = true
    sessionStorage.setItem(noticeKey, 'checking')
    serviceChargesApi.list(month)
      .then((response) => {
        if (!active) return
        sessionStorage.setItem(noticeKey, 'checked')
        const charges = (response.data.data.charges || []).filter((charge) => Number(charge.balance) > 0)
        setUnpaidCharges(charges.length ? { month, charges } : null)
      })
      .catch(() => {
        sessionStorage.removeItem(noticeKey)
      })

    return () => {
      active = false
    }
  }, [rentalManagementEnabled, user?.id])

  const unpaidTotal = unpaidCharges?.charges.reduce((total, charge) => total + Number(charge.balance || 0), 0) || 0
  const unpaidMonthLabel = unpaidCharges
    ? new Date(`${unpaidCharges.month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : ''

  async function handleLogout() {
    await logout()
    navigate('/client/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
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
          {rentalManagementEnabled ? (
            <div>
              <button
                type="button"
                aria-expanded={rentalMenuOpen}
                onClick={() => setRentalMenuOverride({ path: location.pathname, open: !rentalMenuOpen })}
                className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-3 text-sm font-medium text-muted transition hover:bg-canvas hover:text-ink"
              >
                <span className="flex items-center gap-3"><KeyRound size={18} />Rental Management</span>
                <ChevronDown size={16} className={rentalMenuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {rentalMenuOpen ? (
                <div className="ml-4 mt-1 space-y-1 border-l border-line pl-3">
                  {rentalNavItems.map((item) => (
                    <NavLink
                      key={item.label}
                      to={item.to}
                      className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-brand text-white shadow-sm' : 'text-muted hover:bg-canvas hover:text-ink'}`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon size={17} />{item.label}
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
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
          <div className="mb-3 rounded-lg border border-line bg-canvas p-3">
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
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-canvas px-4 md:px-6">
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
          <Outlet context={{ rentalManagementEnabled, rentalSettingsLoaded: typeof branding?.rental_management_enabled === 'boolean' }} />
        </main>
      </div>

      {unpaidCharges ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="service-charge-notice-title" className="w-full max-w-lg rounded-lg border border-line bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-brand">Rental Management</p>
                <h2 id="service-charge-notice-title" className="mt-1 text-xl font-semibold text-ink">Unpaid service charges</h2>
                <p className="mt-1 text-sm text-muted">{unpaidMonthLabel} · Outstanding {formatMoney(unpaidTotal)}</p>
              </div>
              <button type="button" aria-label="Dismiss service charge notice" onClick={() => setUnpaidCharges(null)} className="rounded-md p-2 text-muted hover:bg-canvas"><X size={18} /></button>
            </div>
            <ul className="mt-4 max-h-64 divide-y divide-line overflow-y-auto rounded-md border border-line px-3">
              {unpaidCharges.charges.map((charge) => (
                <li key={charge.id} className="flex items-start justify-between gap-4 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block font-medium text-ink">{charge.category?.name || 'Service charge'}</span>
                    <span className="mt-1 block text-xs text-muted">{charge.rental_property?.name || 'Rental property'}{charge.description ? ` · ${charge.description}` : ''}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-ink">{formatMoney(charge.balance)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Submitted payments remain outstanding until reviewed and approved.</p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setUnpaidCharges(null)} className="rounded-md border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-canvas">Dismiss</button>
              <button type="button" onClick={() => { setUnpaidCharges(null); navigate('/client/service-charges') }} className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">View &amp; Pay Service Charges</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
