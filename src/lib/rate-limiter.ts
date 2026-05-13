export class RateLimitError extends Error {
  constructor(
    public retryAfter: number,
    message = 'Too many requests'
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

type Strategy = 'sliding-window' | 'token-bucket' | 'fixed-window';

interface RateLimiterConfig {
  strategy: Strategy;
  maxRequests: number;
  windowMs: number;
  /** Token bucket: tokens added per interval */
  tokensPerInterval?: number;
  /** Token bucket: interval in ms for adding tokens */
  refillIntervalMs?: number;
  /** Token bucket: max bucket size */
  bucketSize?: number;
}

interface TokenBucketState {
  tokens: number;
  lastRefill: number;
}

interface RateLimiterEntry {
  timestamps: number[];
  tokenBucket?: TokenBucketState;
}

const stores = new Map<string, Map<string, RateLimiterEntry>>();
const CLEANUP_INTERVAL = 60_000;

function getStore(name: string): Map<string, RateLimiterEntry> {
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
  }
  return store;
}

// Periodic cleanup of stale entries
setInterval(() => {
  const now = Date.now();
  const cutoff = now - CLEANUP_INTERVAL * 2;
  stores.forEach((store) => {
    store.forEach((entry, key) => {
      if (entry.timestamps.length > 0 && entry.timestamps[entry.timestamps.length - 1] < cutoff) {
        store.delete(key);
      } else {
        const filtered = entry.timestamps.filter((t) => t > cutoff);
        if (filtered.length === 0) {
          store.delete(key);
        } else {
          entry.timestamps = filtered;
        }
      }
    });
  });
}, CLEANUP_INTERVAL);

function slidingWindowCheck(
  store: Map<string, RateLimiterEntry>,
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  const cutoff = now - windowMs;
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0];
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  entry.timestamps.push(now);
  return { allowed: true, retryAfter: 0 };
}

function tokenBucketCheck(
  store: Map<string, RateLimiterEntry>,
  key: string,
  config: RateLimiterConfig
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [], tokenBucket: { tokens: config.bucketSize ?? config.maxRequests, lastRefill: now } };
    store.set(key, entry);
  }

  if (!entry.tokenBucket) {
    entry.tokenBucket = { tokens: config.bucketSize ?? config.maxRequests, lastRefill: now };
  }

  const refillInterval = config.refillIntervalMs ?? 1000;
  const tokensPerInterval = config.tokensPerInterval ?? 1;
  const bucketSize = config.bucketSize ?? config.maxRequests;
  const elapsed = now - entry.tokenBucket.lastRefill;
  const refills = Math.floor(elapsed / refillInterval);

  if (refills > 0) {
    entry.tokenBucket.tokens = Math.min(
      bucketSize,
      entry.tokenBucket.tokens + refills * tokensPerInterval
    );
    entry.tokenBucket.lastRefill += refills * refillInterval;
  }

  if (entry.tokenBucket.tokens < 1) {
    const nextRefill = entry.tokenBucket.lastRefill + refillInterval;
    const retryAfter = Math.ceil((nextRefill - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  entry.tokenBucket.tokens -= 1;
  return { allowed: true, retryAfter: 0 };
}

function fixedWindowCheck(
  store: Map<string, RateLimiterEntry>,
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowEnd = windowStart + windowMs;

  // Remove entries from previous windows
  entry.timestamps = entry.timestamps.filter((t) => t >= windowStart);

  if (entry.timestamps.length >= maxRequests) {
    const retryAfter = Math.ceil((windowEnd - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  entry.timestamps.push(now);
  return { allowed: true, retryAfter: 0 };
}

export function createRateLimiter(name: string, config: RateLimiterConfig) {
  const store = getStore(name);

  return {
    check(key: string): { allowed: boolean; retryAfter: number } {
      switch (config.strategy) {
        case 'sliding-window':
          return slidingWindowCheck(store, key, config.maxRequests, config.windowMs);
        case 'token-bucket':
          return tokenBucketCheck(store, key, config);
        case 'fixed-window':
          return fixedWindowCheck(store, key, config.maxRequests, config.windowMs);
        default:
          return { allowed: true, retryAfter: 0 };
      }
    },
    reset(key: string): void {
      store.delete(key);
    },
    getState(key: string): RateLimiterEntry | undefined {
      return store.get(key);
    },
    getAllKeys(): Map<string, RateLimiterEntry> {
      return new Map(store);
    },
    getConfig(): RateLimiterConfig {
      return config;
    },
    getName(): string {
      return name;
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;

// Predefined limiters
export const apiLimiter = createRateLimiter('api', {
  strategy: 'sliding-window',
  maxRequests: 60,
  windowMs: 60_000,
});

export const loginLimiter = createRateLimiter('login', {
  strategy: 'token-bucket',
  maxRequests: 5,
  windowMs: 60_000,
  bucketSize: 5,
  tokensPerInterval: 1,
  refillIntervalMs: 12_000,
});

export const bruteForceLimiter = createRateLimiter('brute-force', {
  strategy: 'sliding-window',
  maxRequests: 20,
  windowMs: 900_000, // 15 minutes
});

export const uploadLimiter = createRateLimiter('upload', {
  strategy: 'sliding-window',
  maxRequests: 10,
  windowMs: 60_000,
});
