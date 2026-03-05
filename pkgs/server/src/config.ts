export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/myapp?authSource=admin';
// Auth0 configuration
export const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "";
export const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || "";
export const ITEM_MATCH_THRESHOLD = Number(process.env.ITEM_MATCH_THRESHOLD || "0.6");
export const AZURE_VISION_ENDPOINT = process.env.AZURE_VISION_ENDPOINT || "";
export const AZURE_VISION_KEY = process.env.AZURE_VISION_KEY || "";
export const AZURE_VISION_FEATURES = process.env.AZURE_VISION_FEATURES || "Tags";

// Google Calendar integration
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
export const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "";
export const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:5173";
/** IANA timezone for interpreting delivery window "HH:mm" as local time (e.g. "America/New_York"). */
export const DEFAULT_DELIVERY_TIMEZONE = process.env.DEFAULT_DELIVERY_TIMEZONE || "America/New_York";

if (!AUTH0_DOMAIN) {
  console.error("Warning: AUTH0_DOMAIN environment variable is not set");
}

export default {
  MONGODB_URI,
  AUTH0_DOMAIN,
  AUTH0_AUDIENCE,
  ITEM_MATCH_THRESHOLD,
  AZURE_VISION_ENDPOINT,
  AZURE_VISION_KEY,
  AZURE_VISION_FEATURES,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  APP_BASE_URL,
  DEFAULT_DELIVERY_TIMEZONE,
}