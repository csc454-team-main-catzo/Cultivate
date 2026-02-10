import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { openAPIRouteHandler } from 'hono-openapi'
import { connectDB } from './db.js'
import { User } from './models/User.js'

const app = new Hono()

await connectDB()

app.get('/', (c) => {
  return c.json({ message: 'Hello Hono with MongoDB!' })
})

app.post('/users', async (c) => {
  try {
    const body = await c.req.json()
    const user = await User.create(body)
    return c.json(user, 201)
  } catch (error: any) {
    return c.json({ error: error.message }, 400)
  }
})

app.get('/users', async (c) => {
  try {
    const users = await User.find()
    return c.json(users)
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

app.get(
  '/openapi.json',
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: 'Cultivate',
        version: '0.1.0',
        description: 'test',
      },
    },
    includeEmptyPaths: true,
  }),
)

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
