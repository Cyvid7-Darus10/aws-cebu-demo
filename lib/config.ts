/**
 * Application configuration utility
 * Centralizes environment variable access and provides defaults
 */

export const config = {
  // Base URL for the application
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  
  // App metadata
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'QR Code Generator',
    description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Generate and track QR codes with AWS Amplify',
    siteName: process.env.NEXT_PUBLIC_SITE_NAME || 'QR Code Generator',
  },
  
  // Social media
  social: {
    twitterHandle: process.env.NEXT_PUBLIC_TWITTER_HANDLE || '@qrcodegen',
  },
  
  // Analytics (optional)
  analytics: {
    googleAnalyticsId: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
    hotjarId: process.env.NEXT_PUBLIC_HOTJAR_ID,
  },
  
  // Feature flags
  features: {
    // Add feature flags here as needed
    enableAnalytics: !!process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
  },
} as const;

/**
 * Get the full URL for a given path
 */
export function getFullUrl(path: string = ''): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${config.baseUrl}${cleanPath}`;
}

/**
 * Get the tracking URL for a QR code
 */
export function getTrackingUrl(qrId: string): string {
  return getFullUrl(`/qr/${qrId}`);
}
