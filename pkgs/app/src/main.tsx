import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

// Providers
import { Auth0Provider } from '@auth0/auth0-react'
import { ApiProvider } from './providers/apiContext'
import { UserProvider } from './providers/userContext'

// Layout + guards
import Layout from './components/Layout'
import AuthGuard from './components/AuthGuard'
import AuthOnly from './components/AuthOnly'

// Pages
import Register from './pages/Register'
import Listings from './pages/Listings'
import NewListing from './pages/NewListing'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      }}
    >
      <ApiProvider>
        <UserProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                {/* Public — anyone can browse listings */}
                <Route path="/" element={<Listings />} />
                <Route path="/listings" element={<Listings />} />

                {/* Auth0 only (no registration required) */}
                <Route element={<AuthOnly />}>
                  <Route path="/register" element={<Register />} />
                </Route>

                {/* Fully protected (Auth0 + registered) */}
                <Route element={<AuthGuard />}>
                  <Route path="/listings/new" element={<NewListing />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </UserProvider>
      </ApiProvider>
    </Auth0Provider>
  </StrictMode>,
)
