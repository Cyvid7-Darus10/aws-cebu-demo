/**
 * Production monitoring, logging, and error tracking
 */

interface LogLevel {
  ERROR: "error";
  WARN: "warn";
  INFO: "info";
  DEBUG: "debug";
}

interface LogEntry {
  level: keyof LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

interface MetricEntry {
  name: string;
  value: number;
  unit: "count" | "milliseconds" | "bytes" | "percent";
  timestamp: string;
  tags?: Record<string, string>;
}

class ProductionLogger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isProduction = process.env.NODE_ENV === "production";

  /**
   * Log error with context
   */
  error(
    message: string,
    error?: Error,
    context?: Record<string, unknown> & { requestId?: string; userId?: string }
  ) {
    const logEntry: LogEntry = {
      level: "ERROR",
      message,
      timestamp: new Date().toISOString(),
      requestId: context?.requestId,
      userId: context?.userId,
      metadata: context,
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.writeLog(logEntry);

    // In production, send to error monitoring service
    if (this.isProduction) {
      this.sendToErrorService(logEntry);
    }
  }

  /**
   * Log warning
   */
  warn(
    message: string,
    context?: Record<string, unknown> & { requestId?: string; userId?: string }
  ) {
    const logEntry: LogEntry = {
      level: "WARN",
      message,
      timestamp: new Date().toISOString(),
      requestId: context?.requestId,
      userId: context?.userId,
      metadata: context,
    };

    this.writeLog(logEntry);
  }

  /**
   * Log info
   */
  info(
    message: string,
    context?: Record<string, unknown> & { requestId?: string; userId?: string }
  ) {
    const logEntry: LogEntry = {
      level: "INFO",
      message,
      timestamp: new Date().toISOString(),
      requestId: context?.requestId,
      userId: context?.userId,
      metadata: context,
    };

    this.writeLog(logEntry);
  }

  /**
   * Log debug (only in development)
   */
  debug(
    message: string,
    context?: Record<string, unknown> & { requestId?: string; userId?: string }
  ) {
    if (!this.isDevelopment) return;

    const logEntry: LogEntry = {
      level: "DEBUG",
      message,
      timestamp: new Date().toISOString(),
      requestId: context?.requestId,
      userId: context?.userId,
      metadata: context,
    };

    this.writeLog(logEntry);
  }

  /**
   * Write log entry
   */
  private writeLog(entry: LogEntry) {
    if (this.isDevelopment) {
      // Pretty print for development
      process.stdout.write(
        `[${entry.level}] ${entry.timestamp} - ${entry.message}\n`
      );
      if (entry.error) {
        process.stderr.write(JSON.stringify(entry.error) + "\n");
      }
      if (entry.metadata) {
        process.stdout.write(
          "Context: " + JSON.stringify(entry.metadata) + "\n"
        );
      }
    } else {
      // Structured JSON for production
      const output = entry.level === "ERROR" ? process.stderr : process.stdout;
      output.write(JSON.stringify(entry) + "\n");
    }
  }

  /**
   * Send to external error monitoring service (Sentry, DataDog, etc.)
   */
  private async sendToErrorService(logEntry: LogEntry) {
    // Example integration with Sentry
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureException(error || new Error(logEntry.message), {
    //     level: logEntry.level.toLowerCase() as any,
    //     extra: logEntry.metadata,
    //     tags: {
    //       requestId: logEntry.requestId,
    //       userId: logEntry.userId,
    //     },
    //   });
    // }

    // Example integration with custom logging service
    try {
      if (process.env.LOGGING_ENDPOINT) {
        await fetch(process.env.LOGGING_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.LOGGING_API_KEY}`,
          },
          body: JSON.stringify(logEntry),
        });
      }
    } catch (err) {
      // Fail silently to avoid logging loops
      process.stderr.write(
        JSON.stringify({
          level: "ERROR",
          message: "Failed to send log to external service",
          error: err,
          timestamp: new Date().toISOString(),
        }) + "\n"
      );
    }
  }
}

class ProductionMetrics {
  private metrics: MetricEntry[] = [];
  private flushInterval = 60000; // 1 minute

  constructor() {
    // Flush metrics periodically in production
    if (process.env.NODE_ENV === "production") {
      setInterval(() => {
        this.flush();
      }, this.flushInterval);
    }
  }

  /**
   * Record a metric
   */
  record(
    name: string,
    value: number,
    unit: "count" | "milliseconds" | "bytes" | "percent" = "count",
    tags?: Record<string, string>
  ) {
    const metric: MetricEntry = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      tags,
    };

    this.metrics.push(metric);

    // In development, log immediately
    if (process.env.NODE_ENV === "development") {
      process.stdout.write(
        `[METRIC] ${name}: ${value} ${unit} ${JSON.stringify(tags || {})}\n`
      );
    }
  }

  /**
   * Record timing metric
   */
  timing(name: string, startTime: number, tags?: Record<string, string>) {
    const duration = Date.now() - startTime;
    this.record(name, duration, "milliseconds", tags);
  }

  /**
   * Increment counter
   */
  increment(name: string, tags?: Record<string, string>) {
    this.record(name, 1, "count", tags);
  }

  /**
   * Flush metrics to external service
   */
  private async flush() {
    if (this.metrics.length === 0) return;

    const metricsToFlush = [...this.metrics];
    this.metrics = [];

    try {
      if (process.env.METRICS_ENDPOINT) {
        await fetch(process.env.METRICS_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.METRICS_API_KEY}`,
          },
          body: JSON.stringify({ metrics: metricsToFlush }),
        });
      }
    } catch (error) {
      // Re-add metrics if flush failed
      this.metrics.unshift(...metricsToFlush);
      logger.error("Failed to flush metrics", error as Error);
    }
  }
}

// Performance monitoring
class PerformanceMonitor {
  /**
   * Measure function execution time
   */
  static async measure<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await fn();
      metrics.timing(`${name}.duration`, startTime, {
        ...tags,
        status: "success",
      });
      metrics.increment(`${name}.calls`, { ...tags, status: "success" });
      return result;
    } catch (error) {
      metrics.timing(`${name}.duration`, startTime, {
        ...tags,
        status: "error",
      });
      metrics.increment(`${name}.calls`, { ...tags, status: "error" });
      metrics.increment(`${name}.errors`, tags);
      throw error;
    }
  }

  /**
   * Create a timer for manual timing
   */
  static createTimer(name: string, tags?: Record<string, string>) {
    const startTime = Date.now();

    return {
      end: (additionalTags?: Record<string, string>) => {
        metrics.timing(name, startTime, { ...tags, ...additionalTags });
      },
    };
  }
}

// Health check utilities
export class HealthCheck {
  private checks: Map<string, () => Promise<boolean>> = new Map();

  /**
   * Register a health check
   */
  register(name: string, check: () => Promise<boolean>) {
    this.checks.set(name, check);
  }

  /**
   * Run all health checks
   */
  async runAll(): Promise<{
    healthy: boolean;
    checks: Record<string, boolean>;
  }> {
    const results: Record<string, boolean> = {};
    let allHealthy = true;

    for (const [name, check] of Array.from(this.checks.entries())) {
      try {
        const result = await Promise.race([
          check(),
          new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error("Health check timeout")), 5000)
          ),
        ]);

        results[name] = result;
        if (!result) allHealthy = false;
      } catch (error) {
        results[name] = false;
        allHealthy = false;
        logger.error(`Health check failed: ${name}`, error as Error);
      }
    }

    return { healthy: allHealthy, checks: results };
  }
}

// Export singleton instances
export const logger = new ProductionLogger();
export const metrics = new ProductionMetrics();
export const performance = PerformanceMonitor;
export const healthCheck = new HealthCheck();

// Request context middleware
export function createRequestContext(request: Request) {
  const requestId =
    request.headers.get("X-Request-ID") ||
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    requestId,
    startTime: Date.now(),
    method: request.method,
    url: request.url,
    userAgent: request.headers.get("User-Agent"),
    ip:
      request.headers.get("X-Forwarded-For") ||
      request.headers.get("X-Real-IP") ||
      "unknown",
  };
}

// Error boundary for API routes
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: Record<string, unknown> & {
    requestId?: string;
    userId?: string;
    endpoint?: string;
    method?: string;
  }
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logger.error("Unhandled error in API route", error as Error, context);
    metrics.increment("api.errors", {
      endpoint: context?.endpoint || "unknown",
      method: context?.method || "unknown",
    });
    throw error;
  }
}
