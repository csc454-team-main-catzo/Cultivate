import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { describeRoute, resolver } from "hono-openapi"
import * as v from 'valibot'
import { openAPIRouteHandler } from 'hono-openapi'
import { connectDB } from './db.js'
import { authMiddleware } from './middleware/auth.js'
import imageRoutes from './routes/images.js'
import listingRoutes from './routes/listings.js'
import produceItemRoutes from './routes/produce-items.js'
import userRoutes from './routes/users.js'

type AppBindings = {
  // TODO: this is for convenience, by right should be a union of all middleware
  // and router types or something.
  Variables: any
}

const app = new Hono<AppBindings>()
app.use(
  cors({
    origin: 'https://cultivate-fe.vercel.app',
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
  }),
)

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
    security: [{ bearerAuth: [] }, {}],  // bearerAuth or no auth
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
app.route('/api/listings', listingRoutes)
app.route('/api', imageRoutes)
app.route('/api', produceItemRoutes)

app.get(
  '/openapi.json',
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: 'Cultivate',
        version: '0.1.0',
        description: 'test',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      servers: [
        {
          url:
            process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}`
              : process.env.API_URL || 'http://localhost:3000',
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
