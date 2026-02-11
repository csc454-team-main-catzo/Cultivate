// Refer to vite-env.d.ts for environment variables.

const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const API_BASE = RAW_API_URL.replace(/\/+$/, '')
export const API_URL = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`
export const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN || ''
export const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID || ''
export const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE || undefined

if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
  console.error(
    'Auth0 configuration missing. Please set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID',
  )
}

export default {
  API_URL,
  AUTH0_DOMAIN,
  AUTH0_CLIENT_ID,
  AUTH0_AUDIENCE,
}