/**
 * In-memory sliding-window rate limiter for Hono.
 *
 * Keyed by authenticated userId (falls back to IP). Expired entries are
 * lazily evicted to keep memory bounded. For multi-instance deployments,
 * swap the in-memory store for Redis.
 */

import type { Context, Next } from "hono";

interface RateLimitOptions {
  /** Maximum requests allowed within the window. */
  max: number;
  /** Window size in milliseconds. */
  windowMs: number;
  /** Optional key extractor; defaults to userId ?? IP. */
  keyFn?: (c: Context) => string;
  /** Response message when rate is exceeded. */
  message?: string;
}

interface BucketEntry {
  timestamps: number[];
}

const stores = new Map<string, Map<string, BucketEntry>>();
const EVICT_INTERVAL_MS = 60_000;

function getOrCreateStore(storeId: string): Map<string, BucketEntry> {
  let store = stores.get(storeId);
  if (!store) {
    store = new Map();
    stores.set(storeId, store);

    setInterval(() => {
      const cutoff = Date.now();
      for (const [key, entry] of store!.entries()) {
        entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff - EVICT_INTERVAL_MS * 10);
        if (entry.timestamps.length === 0) store!.delete(key);
      }
    }, EVICT_INTERVAL_MS).unref?.();
  }
  return store;
}

let storeCounter = 0;

export function rateLimiter(options: RateLimitOptions) {
  const { max, windowMs, message } = options;
  const storeId = `rl_${++storeCounter}`;
  const store = getOrCreateStore(storeId);
  const errorMessage = message ?? "Too many requests. Please try again later.";

  const defaultKeyFn = (c: Context): string => {
    const userId = c.get("userId") as string | undefined;
    if (userId) return `user:${userId}`;
    const forwarded = c.req.header("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
    return `ip:${ip}`;
  };

  const keyFn = options.keyFn ?? defaultKeyFn;

  return async (c: Context, next: Next) => {
    const key = keyFn(c);
    const now = Date.now();
    const windowStart = now - windowMs;

    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    if (entry.timestamps.length >= max) {
      c.header("Retry-After", String(Math.ceil(windowMs / 1000)));
      return c.json({ error: errorMessage }, 429);
    }

    entry.timestamps.push(now);
    await next();
  };
}
