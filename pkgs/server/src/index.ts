import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { describeRoute, resolver } from "hono-openapi"
import * as v from 'valibot'
import { openAPIRouteHandler } from 'hono-openapi'
import { connectDB } from './db.js'
import { User } from './models/User.js'
import { authMiddleware } from './middleware/auth.js'
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
// Register a new user (requires Auth0 token + role)
// This endpoint completes user registration after Auth0 authentication
app.post('/users/register', authMiddleware, async (c) => {
  try {
    const auth0Id = c.get('auth0Id')
    const token = c.get('token')
    const isNewUser = c.get('isNewUser')

    // Check if user already exists
    if (!isNewUser) {
      const existingUser = await User.findOne({ auth0Id })
      if (existingUser) {
        return c.json({ error: 'User already registered' }, 400)
      }
    }

    const body = await c.req.json()
    const { role } = body

    if (!role || !['farmer', 'restaurant'].includes(role)) {
      return c.json(
        { error: 'Role is required and must be either "farmer" or "restaurant"' },
        400
      )
    }

    // Extract user info from Auth0 token
    const email = (token?.email as string) || ''
    const name = (token?.name as string) || (token?.nickname as string) || ''

    if (!email) {
      return c.json({ error: 'Email not found in token' }, 400)
    }

    // Create user in database
    const user = await User.create({
      auth0Id,
      email,
      name: name || email.split('@')[0], // Fallback to email prefix if no name
      role,
    })

    return c.json(user, 201)
  } catch (error: any) {
    if (error.code === 11000) {
      return c.json({ error: 'User already exists' }, 400)
    }
    return c.json({ error: error.message }, 400)
  }
})

// Get current authenticated user
app.get('/users/me', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'User not found. Please complete registration.' }, 404)
    }
    return c.json(user)
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// Get all users (protected route)
app.get('/users', authMiddleware, async (c) => {
  try {
    const users = await User.find().select('-auth0Id') // Exclude auth0Id from response
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
