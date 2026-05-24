// src/lib/ratelimit.js
// ─────────────────────────────────────────────────────────────────
//  S-02: Distributed rate limiter — Upstash Redis
//
//  SETUP (one-time):
//  1. Create a free Redis database at https://console.upstash.com
//  2. Copy the REST URL and REST Token from the database dashboard
//  3. Add to Vercel environment variables (and .env.local):
//       UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
//       UPSTASH_REDIS_REST_TOKEN=AXxx...
//  4. npm install @upstash/ratelimit @upstash/redis
//
//  HOW IT WORKS:
//  - Uses a sliding window algorithm across ALL Vercel serverless instances
//  - 10 requests per IP per 60 seconds on auth routes
//  - Falls back to in-memory if Upstash is not configured (dev/test)
//
//  WHY THIS MATTERS (vs the old in-memory Map):
//  Vercel spins up a NEW serverless instance for each concurrent request.
//  Each instance had its own empty Map. An attacker routing 10 requests
//  through 10 parallel connections bypassed the limit entirely.
//  Upstash Redis is a shared store — all instances see the same counters.
// ─────────────────────────────────────────────────────────────────

const WINDOW_SECONDS = 60;
const MAX_REQUESTS   = 10;

// ── Check if Upstash is configured ──────────────────────────────
function hasUpstash() {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return (
    typeof url   === "string" && url.startsWith("https://") &&
    typeof token === "string" && token.length > 10
  );
}

// ── Upstash rate limit (distributed, production) ─────────────────
async function checkUpstash(ip) {
  // Dynamic import — SDK only loaded when Upstash is configured
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis }     = await import("@upstash/redis");

  const ratelimit = new Ratelimit({
    redis:   Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS, `${WINDOW_SECONDS} s`),
    // Prefix namespaces the keys so BOSS auth limits don't collide
    // with any other apps sharing the same Redis instance
    prefix:  "boss_auth",
  });

  const { success, limit, remaining, reset } = await ratelimit.limit(ip);
  return { success, limit, remaining, reset };
}

// ── In-memory fallback (dev / Upstash not configured) ───────────
const _store = new Map();

function checkInMemory(ip) {
  const key    = ip || "unknown";
  const now    = Date.now();
  const record = _store.get(key) || { count: 0, resetAt: now + WINDOW_SECONDS * 1000 };

  if (now > record.resetAt) {
    record.count   = 0;
    record.resetAt = now + WINDOW_SECONDS * 1000;
  }

  record.count++;
  _store.set(key, record);

  // Prevent unbounded memory growth
  if (_store.size > 500) {
    for (const [k, v] of _store) {
      if (now > v.resetAt) _store.delete(k);
    }
  }

  return {
    success:   record.count <= MAX_REQUESTS,
    limit:     MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - record.count),
    reset:     record.resetAt,
  };
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Check if an IP is within the rate limit.
 * Uses Upstash Redis in production, in-memory Map in development.
 *
 * @param {string} ip
 * @returns {Promise<{ success: boolean, limit: number, remaining: number, reset: number }>}
 */
export async function checkRateLimit(ip) {
  const key = (ip || "unknown").trim();

  if (hasUpstash()) {
    try {
      return await checkUpstash(key);
    } catch (err) {
      // If Upstash is temporarily down, fail open with in-memory
      // to avoid blocking all auth traffic. Log the error.
      console.error("[ratelimit] Upstash error — falling back to in-memory:", err?.message);
      return checkInMemory(key);
    }
  }

  return checkInMemory(key);
}

/**
 * Extract the best available IP from a Next.js request.
 * Handles Vercel's x-forwarded-for and Cloudflare CF-Connecting-IP.
 *
 * @param {Request} request
 * @returns {string}
 */
export function getClientIp(request) {
  // Cloudflare sets this when proxying
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return request.headers.get("x-real-ip") || "unknown";
}
