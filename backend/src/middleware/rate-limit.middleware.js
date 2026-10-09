/**
 * Token-bucket rate limiter, one bucket per client IP.
 *
 * Each bucket holds up to `capacity` tokens and refills continuously at
 * `refillPerSecond`. A request spends one token; an empty bucket gets HTTP 429.
 * Refill is computed lazily from elapsed time, so there are no timers per client:
 * O(1) time per request and O(active clients) memory.
 */
export function createRateLimiter({ capacity = 5, refillPerSecond = 5 / 60, idleTtlMs = 10 * 60_000 } = {}) {
  const buckets = new Map(); // ip -> { tokens, updatedAt }

  // Periodically drop idle buckets so memory doesn't grow with every IP ever seen.
  const sweeper = setInterval(() => {
    const cutoff = Date.now() - idleTtlMs;
    for (const [ip, bucket] of buckets) {
      if (bucket.updatedAt < cutoff) buckets.delete(ip);
    }
  }, idleTtlMs);
  sweeper.unref();

  return function rateLimit(req, res, next) {
    const now = Date.now();
    const key = req.ip ?? 'unknown';
    const bucket = buckets.get(key) ?? { tokens: capacity, updatedAt: now };

    const elapsedSeconds = (now - bucket.updatedAt) / 1000;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSeconds * refillPerSecond);
    bucket.updatedAt = now;

    if (bucket.tokens < 1) {
      buckets.set(key, bucket);
      const retryAfter = Math.ceil((1 - bucket.tokens) / refillPerSecond);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: { message: `Too many requests. Try again in ${retryAfter}s.`, status: 429 }
      });
    }

    bucket.tokens -= 1;
    buckets.set(key, bucket);
    res.set('RateLimit-Remaining', String(Math.floor(bucket.tokens)));
    next();
  };
}
