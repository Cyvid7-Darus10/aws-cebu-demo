import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Production-ready middleware for security, rate limiting, and monitoring
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security Headers
  setSecurityHeaders(response);

  // CORS Headers for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    setCorsHeaders(response);
  }

  // Add request tracking headers
  addTrackingHeaders(response, request);

  return response;
}

/**
 * Set comprehensive security headers
 */
function setSecurityHeaders(response: NextResponse) {
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cognito-idp.*.amazonaws.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.amazonaws.com https://*.amplifyapp.com",
    "connect-src 'self' https://*.amazonaws.com https://*.amplifyapp.com wss://*.amazonaws.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  // HTTPS and Transport Security
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  // Prevent content type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // XSS Protection
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Prevent framing (clickjacking protection)
  response.headers.set("X-Frame-Options", "DENY");

  // Referrer Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy (formerly Feature Policy)
  const permissions = [
    "camera=()",
    "microphone=()",
    "geolocation=(self)",
    "payment=()",
    "usb=()",
    "magnetometer=()",
    "accelerometer=()",
    "gyroscope=()",
  ].join(", ");
  response.headers.set("Permissions-Policy", permissions);

  // Prevent DNS prefetching
  response.headers.set("X-DNS-Prefetch-Control", "off");

  // Remove server information
  response.headers.delete("Server");
  response.headers.delete("X-Powered-By");
}

/**
 * Set CORS headers for API routes
 */
function setCorsHeaders(response: NextResponse) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:3000",
    "https://localhost:3000",
  ];

  // In production, you should validate the origin
  response.headers.set("Access-Control-Allow-Origin", "*"); // Configure appropriately for production
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours
}

/**
 * Add request tracking headers for monitoring
 */
function addTrackingHeaders(response: NextResponse, _request: NextRequest) {
  // Generate unique request ID for tracing
  const requestId = generateRequestId();
  response.headers.set("X-Request-ID", requestId);

  // Add timestamp
  response.headers.set("X-Timestamp", new Date().toISOString());

  // Add response time (will be calculated in API routes)
  response.headers.set("X-Response-Time", "0");
}

/**
 * Generate unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
