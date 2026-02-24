import { serve } from '@hono/node-server'
import { connectDB } from './db.js'
import app from './app.js'

await connectDB()

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
