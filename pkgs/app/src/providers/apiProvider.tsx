import type { PropsWithChildren } from 'react'
import { useMemo } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Configuration, DefaultApi, ListingsApi, UsersApi } from 'sdk'
import { ApiContext } from './apiContext'
import CFG from '../config'

export function ApiProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0()

  const apiConfig = useMemo(() => {
    return new Configuration({
      basePath: CFG.API_URL,
      accessToken: async () => {
        if (isAuthenticated) {
          return await getAccessTokenSilently({
            authorizationParams: {
              audience: import.meta.env.VITE_AUTH0_AUDIENCE,
            },
          })
        } else {
          // TODO: specific error type for unauthorized bubble up to error boundary
          // which would trigger redirect to login page. Should catch getAccessTokenSilently too
          throw new Error("something.")
        }
      },
    })
  }, [isAuthenticated, getAccessTokenSilently])

  const misc = useMemo(() => new DefaultApi(apiConfig), [apiConfig])
  const listings = useMemo(() => new ListingsApi(apiConfig), [apiConfig])
  const users = useMemo(() => new UsersApi(apiConfig), [apiConfig])

  return (
    <ApiContext.Provider value={{ misc, listings, users }}>
      {children}
    </ApiContext.Provider>
  )
}
