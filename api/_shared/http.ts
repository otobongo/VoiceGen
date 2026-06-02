// Small helpers shared by the serverless functions: client IP extraction,
// a best-effort in-memory rate limiter, and the Gemini client factory.
//
// NOTE on rate limiting: Vercel serverless functions are stateless and each
// cold start gets fresh memory, so this limiter is "best effort" by design
// (per the project decision). It throttles bursts within a warm instance but
// does not provide durable, cross-instance guarantees. For hard limits, back
// this with a shared store (e.g. Upstash/Redis or a DB).

import { GoogleGenAI } from '@google/genai';
import type { VercelRequest } from '@vercel/node';

export function getClientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  if (Array.isArray(fwd) && fwd.length > 0) {
    return fwd[0];
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * Fixed-window limiter. Returns whether the request is allowed plus headers
 * data. Keyed by `${scope}:${ip}` so different endpoints can have separate
 * budgets.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt, limit };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt, limit };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: limit - bucket.count,
    resetAt: bucket.resetAt,
    limit,
  };
}

// Occasionally prune expired buckets so the map cannot grow unbounded within a
// long-lived warm instance.
function pruneBuckets(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}
setInterval(pruneBuckets, 60_000).unref?.();

let cachedClient: GoogleGenAI | null = null;

/**
 * Returns a cached Gemini client built from the server-side API key.
 * Throws a typed error if the key is not configured so the handler can return
 * a clean 500 rather than leaking a stack trace.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('SERVER_MISCONFIGURED') as Error & { code?: string };
    err.code = 'SERVER_MISCONFIGURED';
    throw err;
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }
  return cachedClient;
}

/** Maps an arbitrary upstream error to a stable, client-safe error code. */
export function classifyError(error: unknown): {
  status: number;
  code: string;
} {
  const message =
    error instanceof Error ? error.message : String(error ?? 'unknown');

  if (message === 'SERVER_MISCONFIGURED') {
    return { status: 500, code: 'SERVER_MISCONFIGURED' };
  }
  if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
    return { status: 429, code: 'QUOTA_EXHAUSTED' };
  }
  if (
    message.includes('API key') ||
    message.includes('API_KEY') ||
    message.includes('PERMISSION_DENIED') ||
    message.includes('Requested entity was not found')
  ) {
    return { status: 502, code: 'UPSTREAM_AUTH' };
  }
  return { status: 502, code: 'UPSTREAM_ERROR' };
}

/** Retry wrapper with exponential backoff for transient quota errors. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
): Promise<T> {
  let delay = 800;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const transient =
        message.includes('429') || message.includes('RESOURCE_EXHAUSTED');
      if (transient && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
  // Unreachable, but satisfies the type checker.
  return fn();
}
