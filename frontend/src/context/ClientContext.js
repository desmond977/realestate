import { createContext, useContext } from 'react'

export const ClientContext = createContext(null)

export function useClient() {
  const context = useContext(ClientContext)

  if (!context) {
    throw new Error('useClient must be used inside ClientProvider')
  }

  return context
}
