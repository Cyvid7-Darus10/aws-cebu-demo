/**
 * Input validation schemas and utilities for production-ready validation
 */

import { z } from "zod";

// URL validation schema
export const urlSchema = z
  .string()
  .min(1, "URL is required")
  .max(2048, "URL is too long")
  .refine((url) => {
    try {
      // Allow URLs with or without protocol
      const testUrl = url.startsWith("http") ? url : `https://${url}`;
      new URL(testUrl);
      return true;
    } catch {
      return false;
    }
  }, "Invalid URL format")
  .refine((url) => {
    // Block potentially dangerous protocols
    const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:"];
    const lowerUrl = url.toLowerCase();
    return !dangerousProtocols.some((protocol) =>
      lowerUrl.startsWith(protocol)
    );
  }, "Invalid URL protocol")
  .refine((url) => {
    // Block localhost and private IPs in production
    if (process.env.NODE_ENV === "production") {
      const testUrl = url.startsWith("http") ? url : `https://${url}`;
      try {
        const urlObj = new URL(testUrl);
        const hostname = urlObj.hostname.toLowerCase();

        // Block localhost
        if (hostname === "localhost" || hostname === "127.0.0.1") {
          return false;
        }

        // Block private IP ranges
        const privateIpRegex =
          /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;
        if (privateIpRegex.test(hostname)) {
          return false;
        }
      } catch {
        // If URL parsing fails, let the previous refine catch it
      }
    }
    return true;
  }, "Private URLs are not allowed in production");

// QR Generation validation
export const qrGenerationSchema = z.object({
  targetUrl: urlSchema,
  label: z
    .string()
    .max(100, "Label is too long")
    .optional()
    .refine((label) => {
      if (!label) return true;
      // Block potentially harmful content
      const harmfulPatterns = /<script|javascript:|on\w+=/i;
      return !harmfulPatterns.test(label);
    }, "Label contains invalid content"),
});

// QR Tracking validation
export const qrTrackingSchema = z.object({
  qrId: z
    .string()
    .min(1, "QR ID is required")
    .max(50, "QR ID is too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "QR ID contains invalid characters"),
  userAgent: z.string().max(500, "User agent is too long").optional(),
  referer: z.string().max(2048, "Referer is too long").optional(),
});

// QR Management validation
export const qrListSchema = z.object({
  limit: z
    .number()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .optional()
    .default(20),
  offset: z.number().min(0, "Offset cannot be negative").optional().default(0),
});

export const qrDeleteSchema = z.object({
  qrId: z
    .string()
    .min(1, "QR ID is required")
    .max(50, "QR ID is too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "QR ID contains invalid characters"),
});

// User input sanitization
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

// Rate limiting validation
export const rateLimitSchema = z.object({
  identifier: z.string().min(1).max(100),
  action: z.enum(["qr_generation", "qr_tracking", "api_call"]),
});

// Error response schema
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  details: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime(),
  requestId: z.string().optional(),
});

// Success response schema
export const successResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown(),
  timestamp: z.string().datetime(),
  requestId: z.string().optional(),
});

/**
 * Validation middleware for API routes
 */
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }
> {
  try {
    let body: unknown;

    if (request.method !== "GET") {
      const contentType = request.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        body = await request.json();
      } else if (contentType?.includes("application/x-www-form-urlencoded")) {
        const formData = await request.formData();
        body = Object.fromEntries(formData.entries());
      } else {
        return {
          success: false,
          error: "Unsupported content type",
        };
      }
    } else {
      // For GET requests, parse query parameters
      const url = new URL(request.url);
      body = Object.fromEntries(url.searchParams.entries());
    }

    const validatedData = schema.parse(body);

    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Validation failed",
        details: error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      };
    }

    return {
      success: false,
      error: "Invalid request format",
    };
  }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: string,
  status: number = 400,
  details?: unknown,
  requestId?: string
): Response {
  const errorResponse = {
    error,
    message: error,
    details,
    timestamp: new Date().toISOString(),
    requestId,
  };

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Create standardized success response
 */
export function createSuccessResponse(
  data: unknown,
  status: number = 200,
  requestId?: string
): Response {
  const successResponse = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId,
  };

  return new Response(JSON.stringify(successResponse), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
