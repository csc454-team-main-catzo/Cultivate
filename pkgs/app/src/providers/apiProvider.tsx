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
          console.log("Getting token...")
          return await getAccessTokenSilently({
            authorizationParams: {
              audience: import.meta.env.VITE_AUTH0_AUDIENCE,
            },
          })
        } else {
          // Reaching here means it tried to call an auth route without an access
          // token... which is useful because we have routes that are auth-optional
          // so we can send a placeholder and handle the case on the backend.
          console.warn("Not auth'ed, no token to get.")
          return "NULL"
          // TODO: on receiving 401 from backend, should redirect to login. but
          // I am not sure where to register the status handler for the SDK.
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
