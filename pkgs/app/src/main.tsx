import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import CFG from './config.ts'
import './index.css'
import App from './App.tsx'
import { UserProvider } from './contexts/userContext'
import { ApiProvider } from './providers/apiProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={CFG.AUTH0_DOMAIN}
      clientId={CFG.AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: CFG.AUTH0_AUDIENCE,
      }}
    >
      <UserProviderWrapper>
        <ApiProvider>
          <App />
        </ApiProvider>
      </UserProviderWrapper>
    </Auth0Provider>
  </StrictMode>,
)

// Wrapper component to access Auth0 hooks
function UserProviderWrapper({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0()

  return (
    <UserProvider
      auth0User={user}
      isAuthenticated={isAuthenticated}
      getAccessTokenSilently={getAccessTokenSilently}
    >
      {children}
    </UserProvider>
  )
}
