import { createContext, useContext } from 'react'
import { DefaultApi, ListingsApi, UsersApi } from 'sdk'

export interface ApiContextState {
  misc: DefaultApi
  listings: ListingsApi
  users: UsersApi
}

export const ApiContext = createContext<ApiContextState | null>(null)

export function useApi() {
  const ctx = useContext(ApiContext)
  if (ctx === null) {
    throw new Error('useApi must be used within an ApiProvider')
  }
  return ctx
}
