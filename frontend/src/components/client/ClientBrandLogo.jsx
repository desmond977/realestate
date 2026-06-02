import { useEffect, useState } from 'react'
import { assetUrl } from '../../api/client'
import { clientBrandingApi } from '../../services/clientApi'

let cachedBranding = null

export function useClientBranding() {
  const [branding, setBranding] = useState(cachedBranding)

  useEffect(() => {
    let active = true

    if (cachedBranding) {
      return undefined
    }

    clientBrandingApi
      .get()
      .then((response) => {
        cachedBranding = response.data
        if (active) {
          setBranding(response.data)
        }
      })
      .catch(() => {
        cachedBranding = {}
        if (active) {
          setBranding({})
        }
      })

    return () => {
      active = false
    }
  }, [])

  return branding || {}
}

export function ClientBrandLogo({ className = '', imageClassName = '', fallbackClassName = '' }) {
  const branding = useClientBranding()

  const logo = assetUrl(branding?.company_logo)

  return (
    <div className={`client-brand-logo ${className}`}>
      {logo ? (
        <img
          src={logo}
          alt={branding?.company_name || 'Company logo'}
          className={imageClassName || 'client-brand-logo-image'}
        />
      ) : (
        <div className={fallbackClassName || 'client-brand-logo-fallback'}>T</div>
      )}
    </div>
  )
}
