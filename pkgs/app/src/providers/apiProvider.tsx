import type { PropsWithChildren } from 'react'
import { useMemo } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Configuration, DefaultApi, ListingsApi } from 'sdk'
import { ApiContext } from './apiContext'
import CFG from '../config'

export function ApiProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0()

  const apiConfig = useMemo(() => {
    return new Configuration({
      basePath: CFG.API_URL,
      accessToken: async () => {
        if (isAuthenticated) {
          try {
            return await getAccessTokenSilently({
              authorizationParams: {
                audience: import.meta.env.VITE_AUTH0_AUDIENCE,
              },
            })
          } catch (error) {
            console.error('Failed to get access token:', error)
            return undefined
          }
        }
        return undefined
      },
    })
  }, [isAuthenticated, getAccessTokenSilently])

  const misc = useMemo(() => new DefaultApi(apiConfig), [apiConfig])
  const listings = useMemo(() => new ListingsApi(apiConfig), [apiConfig])

  return (
    <ApiContext.Provider value={{ misc, listings }}>
      {children}
    </ApiContext.Provider>
  )
}
