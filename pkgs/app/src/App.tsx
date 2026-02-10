import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { useApi } from './providers/apiContext'

function App() {
  const [count, setCount] = useState(0)
  const api = useApi()
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

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          {helloWorld}
        </p>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
