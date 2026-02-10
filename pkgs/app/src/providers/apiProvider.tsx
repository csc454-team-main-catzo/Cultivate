import type { PropsWithChildren } from 'react'
import { useMemo } from 'react'
import { Configuration, DefaultApi, ListingsApi } from 'sdk'
import { ApiContext } from './apiContext'
import { useAuth } from './authContext'

export function ApiProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, getAccessTokenSilently } = useAuth()

  // Create API configuration with Auth0 token
  const apiConfig = useMemo(() => {
    const config = new Configuration({
      basePath: import.meta.env.VITE_API_URL || 'http://localhost:3000',
      accessToken: async () => {
        // Get Auth0 access token for authenticated requests
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
    return config
  }, [isAuthenticated, getAccessTokenSilently])

  const misc = useMemo(() => new DefaultApi(apiConfig), [apiConfig])
  const listings = useMemo(() => new ListingsApi(apiConfig), [apiConfig])

  return (
    <ApiContext.Provider value={{ misc, listings }}>
      {children}
    </ApiContext.Provider>
  )
}
