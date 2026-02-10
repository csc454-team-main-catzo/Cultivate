import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { describeRoute, resolver } from "hono-openapi"
import * as v from 'valibot'
import { openAPIRouteHandler } from 'hono-openapi'
import { connectDB } from './db.js'
import { authMiddleware } from './middleware/auth.js'
import listingRoutes from './routes/listings.js'
import userRoutes from './routes/users.js'

type AppBindings = {
  // TODO: this is for convenience, by right should be a union of all middleware
  // and router types or something.
  Variables: any
}

const app = new Hono<AppBindings>()
app.use(cors({
  origin: '*',
}))

const HealthCheckResponse = v.object({
  healthy: v.boolean(),
  time: v.date(),
  authenticated: v.boolean(),
  auth0Id: v.optional(v.string()),
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
  authMiddleware({ optional: true }),
  (c) => {
    const auth0Id = c.get('auth0Id')
    const authenticated = Boolean(auth0Id)

    return c.json({
      healthy: true,
      time: new Date().toISOString(),
      authenticated,
      ...(authenticated ? { auth0Id } : {}),
    })
  },
)
// Mount resource routers
app.route('/listings', listingRoutes)
app.route('/users', userRoutes)

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
