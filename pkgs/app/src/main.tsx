import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import CFG from './config.ts'
import './index.css'
import App from './App.tsx'
import { UserProvider } from './providers/userProvider.tsx'
import { ApiProvider } from './providers/apiProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={CFG.AUTH0_DOMAIN}
      clientId={CFG.AUTH0_CLIENT_ID}
      authorizationParams={{
        // TODO: this can redirect to the dashboard instead.
        redirect_uri: window.location.origin,
        audience: CFG.AUTH0_AUDIENCE,
      }}
    >
      <ApiProvider>
        <UserProvider>
          <App />
        </UserProvider>
      </ApiProvider>
    </Auth0Provider>
  </StrictMode>,
)