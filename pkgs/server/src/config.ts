export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/myapp?authSource=admin';
// Auth0 configuration
export const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "";
export const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || "";
export const ITEM_MATCH_THRESHOLD = Number(process.env.ITEM_MATCH_THRESHOLD || "0.6");
export const AZURE_VISION_ENDPOINT = process.env.AZURE_VISION_ENDPOINT || "";
export const AZURE_VISION_KEY = process.env.AZURE_VISION_KEY || "";
export const AZURE_VISION_FEATURES = process.env.AZURE_VISION_FEATURES || "Tags";

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
}