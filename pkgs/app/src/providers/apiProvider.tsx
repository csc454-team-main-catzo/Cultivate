import type { PropsWithChildren } from 'react'
import { Configuration, DefaultApi, ListingsApi } from 'sdk'
import { ApiContext } from './apiContext'

export function ApiProvider({ children }: PropsWithChildren) {
  // TODO: seems api is tied to auth flow quite tightly:
  // 1. attempt to make request i.e. /auth/login
  // 2. request successful, return i.e. /auth/login triggers side-effect to store token
  // 3. request fails with 401, goto login with redirect_url set
  const basePath =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:3000' : 'https://cultivate-be.vercel.app')
  const config = new Configuration({
    accessToken: undefined,
    basePath,
  })
  const misc = new DefaultApi(config)
  const listings = new ListingsApi(config)

  return (
    <ApiContext.Provider value={{ misc, listings }}>
      {children}
    </ApiContext.Provider>
  )
}
