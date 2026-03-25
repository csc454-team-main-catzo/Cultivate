export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/myapp?authSource=admin';
// Auth0 configuration
export const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "";
export const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || "";
export const ITEM_MATCH_THRESHOLD = Number(process.env.ITEM_MATCH_THRESHOLD || "0.6");
export const AZURE_VISION_ENDPOINT = process.env.AZURE_VISION_ENDPOINT || "";
export const AZURE_VISION_KEY = process.env.AZURE_VISION_KEY || "";
export const AZURE_VISION_FEATURES = process.env.AZURE_VISION_FEATURES || "Tags";

// CV guardrail thresholds
export const PRODUCE_GUARD_MIN_CONFIDENCE = Number(process.env.PRODUCE_GUARD_MIN_CONFIDENCE || "0.25");
export const LOW_CONFIDENCE_THRESHOLD = Number(process.env.LOW_CONFIDENCE_THRESHOLD || "0.4");
export const MAX_UPLOAD_SIZE_BYTES = Number(process.env.MAX_UPLOAD_SIZE_BYTES || String(10 * 1024 * 1024));

// Rate limiting (per user, sliding window)
export const RATE_LIMIT_UPLOAD_MAX = Number(process.env.RATE_LIMIT_UPLOAD_MAX || "10");
export const RATE_LIMIT_UPLOAD_WINDOW_MS = Number(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS || String(5 * 60 * 1000));
export const RATE_LIMIT_DRAFT_MAX = Number(process.env.RATE_LIMIT_DRAFT_MAX || "20");
export const RATE_LIMIT_DRAFT_WINDOW_MS = Number(process.env.RATE_LIMIT_DRAFT_WINDOW_MS || String(5 * 60 * 1000));
export const RATE_LIMIT_AGENT_MAX = Number(process.env.RATE_LIMIT_AGENT_MAX || "30");
export const RATE_LIMIT_AGENT_WINDOW_MS = Number(process.env.RATE_LIMIT_AGENT_WINDOW_MS || String(5 * 60 * 1000));

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
  PRODUCE_GUARD_MIN_CONFIDENCE,
  LOW_CONFIDENCE_THRESHOLD,
  MAX_UPLOAD_SIZE_BYTES,
  RATE_LIMIT_UPLOAD_MAX,
  RATE_LIMIT_UPLOAD_WINDOW_MS,
  RATE_LIMIT_DRAFT_MAX,
  RATE_LIMIT_DRAFT_WINDOW_MS,
  RATE_LIMIT_AGENT_MAX,
  RATE_LIMIT_AGENT_WINDOW_MS,
}