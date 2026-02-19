const DEFAULT_LIMIT = 100;
const WINDOW_MS = 60_000; // 60 seconds

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 60_000);

export function checkRateLimit(apiKeyId: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
} {
  const now = Date.now();
  const entry = store.get(apiKeyId);

  if (!entry || entry.resetAt <= now) {
    // New window
    const resetAt = now + WINDOW_MS;
    store.set(apiKeyId, { count: 1, resetAt });
    return { allowed: true, remaining: DEFAULT_LIMIT - 1, resetAt, limit: DEFAULT_LIMIT };
  }

  entry.count++;
  const remaining = Math.max(0, DEFAULT_LIMIT - entry.count);
  const allowed = entry.count <= DEFAULT_LIMIT;

  return { allowed, remaining, resetAt: entry.resetAt, limit: DEFAULT_LIMIT };
}
