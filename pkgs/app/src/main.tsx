import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import { Auth0Provider } from '@auth0/auth0-react'
import CFG from './config.ts'
import './index.css'
import App from './App.tsx'
import { UserProvider } from './providers/userProvider.tsx'
import { ApiProvider } from './providers/apiProvider.tsx'

function Auth0ProviderWithRouter({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <Auth0Provider
      domain={CFG.AUTH0_DOMAIN}
      clientId={CFG.AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: CFG.AUTH0_AUDIENCE,
      }}
      onRedirectCallback={(appState) => {
        navigate(appState?.returnTo ?? '/', { replace: true })
      }}
    >
      {children}
    </Auth0Provider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Auth0ProviderWithRouter>
        <ApiProvider>
          <UserProvider>
            <App />
          </UserProvider>
        </ApiProvider>
      </Auth0ProviderWithRouter>
    </BrowserRouter>
  </StrictMode>,
)