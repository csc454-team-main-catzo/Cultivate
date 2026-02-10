import { useState, useEffect } from 'react'
import './App.css'
import { useApi } from './providers/apiContext'
import { useAuth } from './providers/authContext'
import { LoginButton } from './components/LoginButton'
import { LogoutButton } from './components/LogoutButton'
import { UserProfile } from './components/UserProfile'
import { RegistrationForm } from './components/RegistrationForm'

function App() {
  const [count, setCount] = useState(0)
  const api = useApi()
  const { isAuthenticated, isLoading, appUser } = useAuth()
  const [helloWorld, setHelloWorld] = useState("retrieving from server...")

  useEffect(() => {
    let isRunning = false
    const abort = new AbortController()
    const handle = setInterval(() => {
      if (isRunning) return
      isRunning = true
        ; (async () => {
          try {
            const { data } = await api.misc.healthcheck({ signal: abort.signal })
            setHelloWorld(`healthy: ${data.healthy}, server time: ${data.time}`)
          } finally {
            isRunning = false
          }
        })()
    }, 1000)
    return () => {
      clearInterval(handle)
      abort.abort()
    }
  }, [api.misc])

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
            <div className="card">
              <button onClick={() => setCount((count) => count + 1)}>
                count is {count}
              </button>
              <p>
                {helloWorld}
              </p>
            </div>
          </>
        ) : (
          <div>
            <p>Please log in to access the platform.</p>
            <div className="card">
              <button onClick={() => setCount((count) => count + 1)}>
                count is {count}
              </button>
              <p>
                {helloWorld}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
