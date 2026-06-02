import { assetUrl } from '../../api/client'
import { useClientBranding } from '../../hooks/useClientBranding'

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
