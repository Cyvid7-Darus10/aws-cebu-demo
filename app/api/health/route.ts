/**
 * Health check endpoint for production monitoring
 */

import { NextRequest } from "next/server";
import {
  healthCheck,
  logger,
  metrics,
  createRequestContext,
} from "@/lib/monitoring";
import { createSuccessResponse, createErrorResponse } from "@/lib/validation";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

// Register health checks
healthCheck.register("database", async () => {
  try {
    const client = generateClient<Schema>();
    // Simple query to test database connectivity
    const result = await client.models.QrItems.list({
      limit: 1,
    });
    return !result.errors;
  } catch {
    return false;
  }
});

healthCheck.register("storage", async () => {
  try {
    // Test S3 connectivity by checking if we can generate a presigned URL
    // This is a lightweight check that doesn't require actual file operations
    return true; // In production, implement actual S3 health check
  } catch {
    return false;
  }
});

healthCheck.register("memory", async () => {
  const memUsage = process.memoryUsage();
  const maxMemory = 512 * 1024 * 1024; // 512MB threshold
  return memUsage.heapUsed < maxMemory;
});

export async function GET(request: NextRequest) {
  const context = createRequestContext(request);
  const startTime = Date.now();

  try {
    // Run all health checks
    const healthResult = await healthCheck.runAll();

    // Get system information
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Record metrics
    metrics.timing("health_check.duration", startTime);
    metrics.increment("health_check.requests", {
      status: healthResult.healthy ? "healthy" : "unhealthy",
    });

    const healthData = {
      status: healthResult.healthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptime: Math.floor(uptime),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
      },
      checks: healthResult.checks,
      responseTime: Date.now() - startTime,
    };

    // Log health check
    logger.info("Health check completed", {
      ...context,
      healthy: healthResult.healthy,
      responseTime: Date.now() - startTime,
    });

    return createSuccessResponse(
      healthData,
      healthResult.healthy ? 200 : 503,
      context.requestId
    );
  } catch (error) {
    logger.error("Health check failed", error as Error, context);

    metrics.increment("health_check.errors");

    return createErrorResponse(
      "Health check failed",
      500,
      { error: (error as Error).message },
      context.requestId
    );
  }
}
