import { useAuth } from './contexts/AuthContext'
import { LoginButton } from './components/LoginButton'
import { LogoutButton } from './components/LogoutButton'
import { UserProfile } from './components/UserProfile'
import { RegistrationForm } from './components/RegistrationForm'
import './App.css'

function App() {
  const { isAuthenticated, isLoading, appUser } = useAuth()

  if (isLoading) {
    return (
      <div className="app">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <h1>Cultivate Platform</h1>
        <nav>
          {isAuthenticated ? <LogoutButton /> : <LoginButton />}
        </nav>
      </header>

      <main>
        {isAuthenticated ? (
          <>
            <UserProfile />
            {!appUser && <RegistrationForm />}
          </>
        ) : (
          <div>
            <p>Please log in to access the platform.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
