export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/myapp?authSource=admin';
// Auth0 configuration
export const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "";
export const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || "";

if (!AUTH0_DOMAIN) {
  console.error("Warning: AUTH0_DOMAIN environment variable is not set");
}

export default {
  MONGODB_URI,
  AUTH0_DOMAIN,
  AUTH0_AUDIENCE,
}