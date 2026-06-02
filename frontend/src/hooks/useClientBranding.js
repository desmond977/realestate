import { useEffect, useState } from 'react'
import { clientBrandingApi } from '../services/clientApi'

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
