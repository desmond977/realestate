import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'
import { ClientProvider } from './context/ClientProvider.jsx'
import { applyBranding, getPersistedBranding, getPersistedUserTheme } from './utils/theme.js'

applyBranding({ ...getPersistedUserTheme(), ...getPersistedBranding() })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ClientProvider>
          <App />
        </ClientProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
