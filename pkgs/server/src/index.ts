import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { describeRoute, resolver, validator } from "hono-openapi"
import * as v from 'valibot'
import { openAPIRouteHandler } from 'hono-openapi'
import { connectDB } from './db.js'
import { User } from './models/User.js'
import listingRoutes from './routes/listings.js'

const app = new Hono()
app.use(cors({
  origin: '*',
}))

const HealthCheckResponse = v.object({
  healthy: v.boolean(),
  time: v.date(),
})

app.get(
  '/health',
  describeRoute({
    operationId: 'healthcheck',
    summary: 'Health check route',
    responses: {
      200: {
        description: 'Array of listings',
        content: {
          'application/json': {
            schema: resolver(HealthCheckResponse),
          },
        },
      },
      500: { description: 'Server error' },
    },
  }),
  (c) => {
    return c.json({ healthy: true, time: new Date().toISOString() })
  },
)
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

// Mount listing routes
app.route('/listings', listingRoutes)

app.get(
  '/openapi.json',
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: 'Cultivate',
        version: '0.1.0',
        description: 'test',
      },
      servers: [
        {
          // TODO: get host URL from env var.
          url: 'http://localhost:3000',
        },
      ],
    },
    includeEmptyPaths: true,
  }),
)

await connectDB()

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
