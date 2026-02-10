import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import './index.css'
import App from './App.tsx'
import { UserProvider } from './contexts/userContext'
import { ApiProvider } from './providers/apiProvider.tsx'

const domain = import.meta.env.VITE_AUTH0_DOMAIN || ''
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID || ''
const audience = import.meta.env.VITE_AUTH0_AUDIENCE || ''

if (!domain || !clientId) {
  console.warn('Auth0 configuration missing. Please set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: audience || undefined,
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
