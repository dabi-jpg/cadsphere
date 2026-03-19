/**
 * In-memory sliding window rate limiter.
 *
 * SECURITY: Protects API routes from brute-force and abuse.
 * Uses a Map of timestamps per key (IP or user ID).
 *
 * Production note: For multi-instance deployments, replace this
 * with a Redis-backed solution (e.g. @upstash/ratelimit).
 * This in-memory approach works for single-instance deployments.
 */

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/** Default rate limit configurations */
export const RATE_LIMITS = {
  /** Auth endpoints: 10 requests per minute (brute-force protection) */
  auth: { maxRequests: 10, windowMs: 60_000 },
  /** File upload: 20 requests per minute */
  upload: { maxRequests: 20, windowMs: 60_000 },
  /** General API: 100 requests per minute */
  general: { maxRequests: 100, windowMs: 60_000 },
} as const;

/** Stores timestamps of requests per key */
const requestStore = new Map<string, number[]>();

/** Cleanup interval: remove stale entries every 5 minutes */
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Periodic cleanup to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of requestStore.entries()) {
      const filtered = timestamps.filter((t) => now - t < 300_000);
      if (filtered.length === 0) {
        requestStore.delete(key);
      } else {
        requestStore.set(key, filtered);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Check if a request should be rate limited.
 * @returns Object with `allowed` boolean and remaining requests count.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = RATE_LIMITS.general
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get existing timestamps or initialize
  const timestamps = requestStore.get(key) || [];

  // Filter to only timestamps within the current window
  const recentTimestamps = timestamps.filter((t) => t > windowStart);

  // Check if limit is exceeded
  const allowed = recentTimestamps.length < config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - recentTimestamps.length - (allowed ? 1 : 0));

  if (allowed) {
    recentTimestamps.push(now);
    requestStore.set(key, recentTimestamps);
  }

  // Calculate when the oldest request in the window will expire
  const resetMs = recentTimestamps.length > 0
    ? Math.max(0, recentTimestamps[0] + config.windowMs - now)
    : 0;

  return { allowed, remaining, resetMs };
}

/**
 * Get rate limit key from request headers.
 * Uses x-forwarded-for header for IP, falls back to "unknown".
 */
export function getRateLimitKey(request: Request, prefix: string = "ip"): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `${prefix}:${ip}`;
}
