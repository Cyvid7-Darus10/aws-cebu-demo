/**
 * Rate limiting utility for production API protection
 * Uses in-memory storage for simplicity, can be extended with Redis for distributed systems
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;

    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup() {
    const now = Date.now();
    Array.from(this.store.entries()).forEach(([key, entry]) => {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    });
  }

  private getKey(identifier: string): string {
    return `rate_limit:${identifier}`;
  }

  check(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const key = this.getKey(identifier);
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.config.windowMs,
      };
      this.store.set(key, newEntry);

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: newEntry.resetTime,
      };
    }

    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // Increment count
    entry.count++;
    this.store.set(key, entry);

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  reset(identifier: string): void {
    const key = this.getKey(identifier);
    this.store.delete(key);
  }
}

// Pre-configured rate limiters
export const qrGenerationLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 QR codes per 15 minutes per user
});

export const qrTrackingLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 scans per minute per IP
});

export const apiLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 API calls per 15 minutes
});

/**
 * Get client identifier for rate limiting
 */
export function getClientIdentifier(request: Request): string {
  // Try to get user ID from auth header if available
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    try {
      // Extract user ID from JWT token (simplified)
      const token = authHeader.replace("Bearer ", "");
      // In production, properly decode and validate the JWT
      return `user:${token.substring(0, 20)}`; // Use first 20 chars as identifier
    } catch {
      // Fall through to IP-based limiting
    }
  }

  // Fallback to IP-based limiting
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";

  return `ip:${ip}`;
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export async function withRateLimit<T>(
  request: Request,
  limiter: RateLimiter,
  handler: () => Promise<T>
): Promise<Response | T> {
  const identifier = getClientIdentifier(request);
  const result = limiter.check(identifier);

  if (!result.allowed) {
    const resetTime = new Date(result.resetTime).toISOString();

    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        resetTime,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": limiter["config"].maxRequests.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": result.resetTime.toString(),
          "Retry-After": Math.ceil(
            (result.resetTime - Date.now()) / 1000
          ).toString(),
        },
      }
    );
  }

  try {
    const response = await handler();

    // Add rate limit headers to successful responses if it's a Response object
    if (response instanceof Response) {
      response.headers.set(
        "X-RateLimit-Limit",
        limiter["config"].maxRequests.toString()
      );
      response.headers.set(
        "X-RateLimit-Remaining",
        result.remaining.toString()
      );
      response.headers.set("X-RateLimit-Reset", result.resetTime.toString());
    }

    return response;
  } catch (error) {
    // Don't count failed requests against rate limit if configured
    if (limiter["config"].skipFailedRequests) {
      limiter.reset(identifier);
    }
    throw error;
  }
}
