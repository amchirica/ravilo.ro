import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type LimitResult = { success: boolean; remaining: number };

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, limit: number, windowMs: number): LimitResult {
  const now = Date.now();
  const current = memory.get(key);
  if (!current || current.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }
  if (current.count >= limit) {
    return { success: false, remaining: 0 };
  }
  current.count += 1;
  return { success: true, remaining: limit - current.count };
}

function redis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return Redis.fromEnv();
}

const limiters = new Map<string, Ratelimit>();

function redisLimiter(name: string, limit: number, windowSec: number): Ratelimit | null {
  const client = redis();
  if (!client) return null;
  const cached = limiters.get(name);
  if (cached) return cached;
  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    prefix: `ravilo:${name}`,
  });
  limiters.set(name, limiter);
  return limiter;
}

export async function rateLimit(
  name: string,
  identity: string,
  limit: number,
  windowSec: number,
): Promise<LimitResult> {
  const limiter = redisLimiter(name, limit, windowSec);
  if (limiter) {
    const result = await limiter.limit(identity);
    return { success: result.success, remaining: result.remaining };
  }
  return memoryLimit(`${name}:${identity}`, limit, windowSec * 1000);
}

export const RATE_LIMITS = {
  login: { limit: 8, windowSec: 60 * 15 },
  register: { limit: 5, windowSec: 60 * 15 },
  passwordReset: { limit: 5, windowSec: 60 * 15 },
  contact: { limit: 4, windowSec: 60 * 15 },
  review: { limit: 5, windowSec: 60 * 60 },
  checkout: { limit: 10, windowSec: 60 * 10 },
  coupon: { limit: 20, windowSec: 60 * 10 },
  search: { limit: 40, windowSec: 60 },
  returns: { limit: 5, windowSec: 60 * 15 },
} as const;
