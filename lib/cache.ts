/**
 * Production caching strategies for performance optimization
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CacheValue = any;

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  tags?: string[]; // Cache tags for invalidation
  serialize?: boolean; // Whether to serialize the data
}

/**
 * In-memory cache with TTL and tag-based invalidation
 * In production, consider using Redis or another distributed cache
 */
class MemoryCache {
  private cache = new Map<string, CacheEntry<CacheValue>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000
    );
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: options.ttl || 5 * 60 * 1000, // Default 5 minutes
      tags: options.tags,
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate cache by tags
   */
  invalidateByTags(tags: string[]): number {
    let invalidated = 0;

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.tags && entry.tags.some((tag) => tags.includes(tag))) {
        this.cache.delete(key);
        invalidated++;
      }
    });

    return invalidated;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    Array.from(this.cache.values()).forEach((entry) => {
      if (now > entry.timestamp + entry.ttl) {
        expired++;
      } else {
        active++;
      }
    });

    return {
      total: this.cache.size,
      active,
      expired,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Destroy cache instance
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

/**
 * Cache with automatic serialization for complex objects
 */
class SerializingCache extends MemoryCache {
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const serializedData =
      options.serialize !== false ? JSON.stringify(data) : data;

    super.set(key, serializedData, options);
  }

  get<T>(key: string): T | null {
    const data = super.get<string | T>(key);

    if (data === null) {
      return null;
    }

    try {
      // Try to parse as JSON, fallback to original data
      return typeof data === "string" ? JSON.parse(data) : data;
    } catch {
      return data as T;
    }
  }
}

/**
 * Memoization decorator for functions
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    ttl?: number;
    keyGenerator?: (...args: Parameters<T>) => string;
    cache?: MemoryCache;
  } = {}
): T {
  const cache = options.cache || new MemoryCache();
  const ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default

  const memoized = ((...args: Parameters<T>): ReturnType<T> => {
    const key = options.keyGenerator
      ? options.keyGenerator(...args)
      : `memoized:${fn.name}:${JSON.stringify(args)}`;

    // Check cache first
    const cached = cache.get<ReturnType<T>>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = fn(...args);
    cache.set(key, result, { ttl });

    return result;
  }) as T;

  // Add cache control methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (memoized as any).clearCache = () => cache.clear();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (memoized as any).invalidate = (...args: Parameters<T>) => {
    const key = options.keyGenerator
      ? options.keyGenerator(...args)
      : `memoized:${fn.name}:${JSON.stringify(args)}`;
    cache.delete(key);
  };

  return memoized;
}

/**
 * Cache for QR code data with specific invalidation strategies
 */
export class QrCache {
  private cache = new SerializingCache();

  /**
   * Cache QR item data
   */
  setQrItem(qrId: string, data: CacheValue, userId?: string): void {
    const tags = ["qr_items"];
    if (userId) {
      tags.push(`user:${userId}`);
    }

    this.cache.set(`qr_item:${qrId}`, data, {
      ttl: 10 * 60 * 1000, // 10 minutes
      tags,
    });
  }

  /**
   * Get QR item from cache
   */
  getQrItem(qrId: string): CacheValue | null {
    return this.cache.get(`qr_item:${qrId}`);
  }

  /**
   * Cache QR image URL
   */
  setQrImage(qrId: string, imageUrl: string): void {
    this.cache.set(`qr_image:${qrId}`, imageUrl, {
      ttl: 60 * 60 * 1000, // 1 hour (S3 URLs are stable)
      tags: ["qr_images"],
    });
  }

  /**
   * Get QR image URL from cache
   */
  getQrImage(qrId: string): string | null {
    return this.cache.get(`qr_image:${qrId}`);
  }

  /**
   * Cache user's QR list
   */
  setUserQrList(userId: string, qrList: CacheValue[]): void {
    this.cache.set(`user_qrs:${userId}`, qrList, {
      ttl: 5 * 60 * 1000, // 5 minutes
      tags: [`user:${userId}`, "qr_lists"],
    });
  }

  /**
   * Get user's QR list from cache
   */
  getUserQrList(userId: string): CacheValue[] | null {
    return this.cache.get(`user_qrs:${userId}`);
  }

  /**
   * Invalidate cache when QR is created/updated/deleted
   */
  invalidateQr(qrId: string, userId?: string): void {
    this.cache.delete(`qr_item:${qrId}`);
    this.cache.delete(`qr_image:${qrId}`);

    if (userId) {
      this.cache.delete(`user_qrs:${userId}`);
      this.cache.invalidateByTags([`user:${userId}`]);
    }
  }

  /**
   * Invalidate all QR-related cache for a user
   */
  invalidateUser(userId: string): void {
    this.cache.invalidateByTags([`user:${userId}`]);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }
}

/**
 * Response caching for API routes
 */
export class ResponseCache {
  private cache = new MemoryCache();

  /**
   * Generate cache key for request
   */
  private getCacheKey(request: Request): string {
    const url = new URL(request.url);
    const method = request.method;
    const searchParams = url.searchParams.toString();
    const authHeader = request.headers.get("authorization");

    // Include user context in cache key for personalized responses
    const userContext = authHeader ? authHeader.substring(0, 20) : "anonymous";

    return `response:${method}:${url.pathname}:${searchParams}:${userContext}`;
  }

  /**
   * Get cached response
   */
  get(request: Request): Response | null {
    const key = this.getCacheKey(request);
    const cached = this.cache.get<{
      status: number;
      headers: Record<string, string>;
      body: string;
    }>(key);

    if (!cached) {
      return null;
    }

    return new Response(cached.body, {
      status: cached.status,
      headers: {
        ...cached.headers,
        "X-Cache": "HIT",
        "X-Cache-Key": key,
      },
    });
  }

  /**
   * Cache response
   */
  async set(
    request: Request,
    response: Response,
    options: CacheOptions = {}
  ): Promise<Response> {
    const key = this.getCacheKey(request);

    // Clone response to read body without consuming original
    const responseClone = response.clone();
    const body = await responseClone.text();

    const cacheData = {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body,
    };

    this.cache.set(key, cacheData, {
      ttl: options.ttl || 5 * 60 * 1000, // 5 minutes default
      tags: options.tags,
    });

    // Add cache headers to original response
    response.headers.set("X-Cache", "MISS");
    response.headers.set("X-Cache-Key", key);

    return response;
  }

  /**
   * Invalidate cached responses by tags
   */
  invalidate(tags: string[]): number {
    return this.cache.invalidateByTags(tags);
  }
}

// Export singleton instances
export const memoryCache = new MemoryCache();
export const qrCache = new QrCache();
export const responseCache = new ResponseCache();

// Cache middleware for API routes
export async function withCache(
  request: Request,
  handler: () => Promise<Response>,
  options: CacheOptions & {
    cacheableStatus?: number[];
    cacheableMethods?: string[];
  } = {}
): Promise<Response> {
  const cacheableMethods = options.cacheableMethods || ["GET"];
  const cacheableStatus = options.cacheableStatus || [200];

  // Only cache GET requests by default
  if (!cacheableMethods.includes(request.method)) {
    return handler();
  }

  // Check cache first
  const cached = responseCache.get(request);
  if (cached) {
    return cached;
  }

  // Execute handler
  const response = await handler();

  // Cache successful responses
  if (cacheableStatus.includes(response.status)) {
    return responseCache.set(request, response, options);
  }

  return response;
}
