# Troubleshooting Guide

## Common Issues and Solutions

### Authentication Issues

#### Problem: "User is not authenticated" error

**Symptoms:**

- Users can't access protected resources
- API calls return 401 Unauthorized
- Authentication state not persisting

**Diagnosis:**

```typescript
// Check authentication state
import { getCurrentUser } from "aws-amplify/auth";

const checkAuthState = async () => {
  try {
    const user = await getCurrentUser();
    console.log("User is authenticated:", user);
    return user;
  } catch (error) {
    console.log("User is not authenticated:", error);
    return null;
  }
};
```

**Solutions:**

1. **Check Amplify Configuration**

```typescript
// Ensure Amplify is configured correctly
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";

// This should be called once, preferably in your root layout
Amplify.configure(outputs);
```

2. **Verify JWT Token**

```typescript
import { fetchAuthSession } from "aws-amplify/auth";

const verifyToken = async () => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken;

    if (token) {
      console.log("Token valid until:", new Date(token.payload.exp * 1000));
      return true;
    }
  } catch (error) {
    console.error("Token verification failed:", error);
  }
  return false;
};
```

3. **Handle Token Refresh**

```typescript
import { fetchAuthSession } from "aws-amplify/auth";

export async function getValidToken() {
  try {
    const session = await fetchAuthSession({ forceRefresh: true });
    return session.tokens?.idToken?.toString();
  } catch (error) {
    console.error("Failed to refresh token:", error);
    // Redirect to login
    window.location.href = "/auth/signin";
    return null;
  }
}
```

#### Problem: "NotAuthorizedException" during sign-in

**Symptoms:**

- Valid credentials rejected
- Users can't sign in with correct password
- Intermittent sign-in failures

**Solutions:**

1. **Check Password Policy**

```typescript
// Verify password meets requirements
const validatePassword = (password: string) => {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSymbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  return requirements;
};
```

2. **Handle Account Status**

```typescript
import { signIn } from "aws-amplify/auth";

export async function handleSignIn(email: string, password: string) {
  try {
    const result = await signIn({ username: email, password });

    if (result.isSignedIn) {
      return { success: true };
    } else {
      // Handle additional steps (MFA, password change, etc.)
      return { success: false, nextStep: result.nextStep };
    }
  } catch (error: any) {
    switch (error.name) {
      case "NotAuthorizedException":
        return { success: false, error: "Invalid email or password" };
      case "UserNotFoundException":
        return { success: false, error: "No account found with this email" };
      case "UserNotConfirmedException":
        return { success: false, error: "Please verify your email address" };
      case "TooManyRequestsException":
        return {
          success: false,
          error: "Too many attempts. Please try again later.",
        };
      default:
        return { success: false, error: "Sign in failed. Please try again." };
    }
  }
}
```

---

### GraphQL Authorization Errors

#### Problem: "Not Authorized to access" errors

**Symptoms:**

- API queries/mutations return authorization errors
- User can authenticate but can't access data
- Inconsistent access to resources

**Diagnosis:**

```typescript
// Check authorization rules in your schema
const debugAuthRules = async () => {
  try {
    // Test different authorization scenarios
    const publicQuery = await client.models.QrItems.list();
    console.log("Public access works:", publicQuery.data.length);

    const ownerQuery = await client.models.QrItems.list({
      authMode: "userPool",
    });
    console.log("Owner access works:", ownerQuery.data.length);
  } catch (error: any) {
    console.error("Authorization error:", error.message);
    console.error("Error details:", error.errors);
  }
};
```

**Solutions:**

1. **Review Authorization Rules**

```typescript
// Correct authorization setup
const schema = a.schema({
  QrItems: a
    .model({
      id: a.id().required(),
      targetUrl: a.string().required(),
      ownerSub: a.string(),
    })
    .authorization((allow) => [
      // Public read access for QR scanning
      allow.publicApiKey().to(["read"]),
      // Owner access for CRUD operations
      allow.owner().to(["create", "read", "update", "delete"]),
      // Authenticated users can read
      allow.authenticated().to(["read"]),
    ]),
});
```

2. **Set Correct Auth Mode**

```typescript
// Use appropriate auth mode for different operations
const client = generateClient<Schema>();

// For public operations (QR scanning)
const publicData = await client.models.QrItems.get(
  { id: "qr-id" },
  { authMode: "apiKey" },
);

// For user-specific operations
const userData = await client.models.QrItems.list({
  authMode: "userPool",
});
```

3. **Handle Multi-Auth Scenarios**

```typescript
export async function getQRCode(id: string, authMode?: "apiKey" | "userPool") {
  // Try with user credentials first
  try {
    return await client.models.QrItems.get(
      { id },
      { authMode: authMode || "userPool" },
    );
  } catch (error: any) {
    if (error.name === "UnauthorizedException") {
      // Fallback to public access
      return await client.models.QrItems.get({ id }, { authMode: "apiKey" });
    }
    throw error;
  }
}
```

---

### Database and Data Issues

#### Problem: DynamoDB "Item not found" or query failures

**Symptoms:**

- Empty results from valid queries
- Inconsistent data retrieval
- Secondary index query failures

**Solutions:**

1. **Check Query Syntax**

```typescript
// Correct filtering syntax
const correctQuery = await client.models.QrItems.list({
  filter: {
    isActive: { eq: true },
    createdAt: { gt: "2024-01-01T00:00:00.000Z" },
  },
  limit: 20,
});

// Avoid common mistakes
const incorrectQuery = await client.models.QrItems.list({
  // Wrong: This won't work
  filter: {
    isActive: true, // Should be { eq: true }
  },
});
```

2. **Use Proper Indexes**

```typescript
// Define secondary indexes in schema
const schema = a.schema({
  QrItems: a
    .model({
      id: a.id().required(),
      ownerSub: a.string(),
      createdAt: a.datetime().required(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.owner()])
    .secondaryIndexes((index) => [
      // Index for querying by owner
      index("ownerSub").sortKeys(["createdAt"]).name("byOwner"),
      // Index for active items
      index("isActive").sortKeys(["createdAt"]).name("byActiveStatus"),
    ]),
});

// Query using secondary index
const userQRCodes = await client.models.QrItems.listQrItemsByOwner({
  ownerSub: "user-123",
  sortDirection: "DESC",
  limit: 10,
});
```

3. **Handle Eventually Consistent Reads**

```typescript
// For critical reads, use consistent reads when available
const getLatestData = async (id: string) => {
  // DynamoDB is eventually consistent for secondary indexes
  // For strongly consistent reads, use primary key queries

  try {
    const result = await client.models.QrItems.get({ id });
    return result;
  } catch (error) {
    console.warn("Direct read failed, trying with delay...");
    // Add small delay for eventual consistency
    await new Promise((resolve) => setTimeout(resolve, 100));
    return await client.models.QrItems.get({ id });
  }
};
```

#### Problem: Data synchronization issues

**Symptoms:**

- Data not updating in real-time
- Stale data in UI
- Inconsistent state across components

**Solutions:**

1. **Debug Subscriptions**

```typescript
// Check subscription setup
useEffect(() => {
  console.log("Setting up subscriptions...");

  const createSub = client.models.QrItems.onCreate().subscribe({
    next: (data) => {
      console.log("Subscription received:", data);
      // Update state
    },
    error: (error) => {
      console.error("Subscription error:", error);
    },
  });

  const updateSub = client.models.QrItems.onUpdate().subscribe({
    next: (data) => {
      console.log("Update received:", data);
    },
  });

  // Important: Return cleanup function
  return () => {
    console.log("Cleaning up subscriptions...");
    createSub.unsubscribe();
    updateSub.unsubscribe();
  };
}, []); // Empty dependency array is important
```

2. **Manual Cache Invalidation**

```typescript
// Force refresh when needed
const [refreshKey, setRefreshKey] = useState(0);

const forceRefresh = () => {
  setRefreshKey((prev) => prev + 1);
};

useEffect(() => {
  fetchData();
}, [refreshKey]); // Refetch when refreshKey changes
```

3. **Optimistic Updates**

```typescript
const createQRCodeOptimistic = async (input: CreateQRInput) => {
  const tempId = `temp-${Date.now()}`;
  const tempQRCode = {
    ...input,
    id: tempId,
    createdAt: new Date().toISOString(),
  };

  // Immediately update UI
  setQrCodes((prev) => [tempQRCode, ...prev]);

  try {
    // Make API call
    const result = await client.models.QrItems.create(input);

    // Replace temp item with real data
    setQrCodes((prev) =>
      prev.map((item) => (item.id === tempId ? result.data : item)),
    );
  } catch (error) {
    // Remove temp item on failure
    setQrCodes((prev) => prev.filter((item) => item.id !== tempId));
    throw error;
  }
};
```

---

### Storage and File Upload Issues

#### Problem: File upload failures

**Symptoms:**

- Uploads timeout or fail
- Files not appearing in S3
- Permission denied errors

**Solutions:**

1. **Check File Size and Type**

```typescript
const validateFile = (file: File) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ["image/png", "image/jpeg", "image/gif"];

  if (file.size > maxSize) {
    throw new Error("File size too large (max 10MB)");
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type");
  }

  return true;
};
```

2. **Handle Upload Errors**

```typescript
import { uploadData } from "aws-amplify/storage";

const uploadWithRetry = async (file: File, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadData({
        key: `uploads/${Date.now()}-${file.name}`,
        data: file,
        options: {
          contentType: file.type,
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              const progress = Math.round(
                (transferredBytes / totalBytes) * 100,
              );
              console.log(`Upload progress: ${progress}%`);
            }
          },
        },
      }).result;

      console.log(`Upload successful on attempt ${attempt}`);
      return result;
    } catch (error: any) {
      console.error(`Upload attempt ${attempt} failed:`, error);

      if (attempt === maxRetries) {
        throw new Error(
          `Upload failed after ${maxRetries} attempts: ${error.message}`,
        );
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
};
```

3. **Debug Storage Configuration**

```typescript
// Check storage permissions
import { list } from "aws-amplify/storage";

const debugStorageAccess = async () => {
  try {
    // Test list access
    const result = await list({
      prefix: "public/",
      options: { listAll: true },
    });
    console.log("Storage access works:", result.items.length, "items found");

    // Test upload access
    const testUpload = await uploadData({
      key: "test/connectivity-test.txt",
      data: new Blob(["test"], { type: "text/plain" }),
    }).result;

    console.log("Upload test successful:", testUpload.key);
  } catch (error) {
    console.error("Storage access failed:", error);
  }
};
```

#### Problem: Signed URL generation failures

**Symptoms:**

- URLs return 403 Forbidden
- Images not displaying
- Expired URL errors

**Solutions:**

1. **Generate Proper Signed URLs**

```typescript
import { getUrl } from "aws-amplify/storage";

const getSignedImageUrl = async (key: string) => {
  try {
    const signedUrl = await getUrl({
      key,
      options: {
        expiresIn: 3600, // 1 hour
        useAccelerateEndpoint: true, // Use CloudFront if available
      },
    });

    return signedUrl.url;
  } catch (error: any) {
    console.error("Failed to generate signed URL:", error);

    if (error.name === "NoSuchKey") {
      throw new Error("File not found");
    }

    throw new Error("Failed to generate download URL");
  }
};
```

2. **Handle URL Expiration**

```typescript
// URL cache with automatic refresh
class URLCache {
  private cache = new Map<string, { url: string; expires: number }>();

  async getURL(key: string) {
    const cached = this.cache.get(key);
    const now = Date.now();

    // Return cached URL if still valid (with 5-minute buffer)
    if (cached && cached.expires > now + 300000) {
      return cached.url;
    }

    // Generate new signed URL
    const signedUrl = await getUrl({
      key,
      options: { expiresIn: 3600 },
    });

    this.cache.set(key, {
      url: signedUrl.url.toString(),
      expires: now + 3600000, // 1 hour from now
    });

    return signedUrl.url.toString();
  }
}

const urlCache = new URLCache();
```

---

### Lambda Function Issues

#### Problem: Lambda function timeouts or cold starts

**Symptoms:**

- Function execution timeouts
- Slow response times
- Cold start latency

**Solutions:**

1. **Optimize Function Performance**

```typescript
// Optimize imports and initialization
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";

// Initialize clients outside the handler (reused across invocations)
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  maxAttempts: 3,
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

export const handler = async (event: any) => {
  // Handler code using pre-initialized clients
};
```

2. **Proper Error Handling**

```typescript
export const handler = async (event: APIGatewayProxyEvent) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    // Validate input early
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing request body" }),
      };
    }

    const input = JSON.parse(event.body);

    // Process request
    const result = await processRequest(input);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: result }),
    };
  } catch (error: any) {
    console.error("Lambda error:", error);

    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({
        error: error.message || "Internal server error",
        requestId: event.requestContext?.requestId,
      }),
    };
  }
};
```

3. **Memory and Timeout Optimization**

```typescript
// amplify/functions/my-function/resource.ts
import { defineFunction } from "@aws-amplify/backend";

export const myFunction = defineFunction({
  name: "my-optimized-function",
  entry: "./handler.ts",
  runtime: 20, // Use latest Node.js version
  timeoutSeconds: 30, // Increase if needed
  memoryMB: 512, // Right-size based on profiling
  environment: {
    NODE_OPTIONS: "--enable-source-maps", // Better error traces
  },
});
```

#### Problem: Environment configuration issues

**Symptoms:**

- Environment variables not available
- Configuration mismatches between environments
- Deployment failures

**Solutions:**

1. **Validate Environment Variables**

```typescript
// Validate required environment variables on startup
const requiredEnvVars = ["AWS_REGION", "DYNAMODB_TABLE_NAME", "S3_BUCKET_NAME"];

const validateEnvironment = () => {
  const missing = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
};

export const handler = async (event: any) => {
  validateEnvironment();
  // Rest of handler code
};
```

2. **Environment-specific Configuration**

```typescript
// utils/config.ts
export const getConfig = () => {
  const environment = process.env.NODE_ENV || "development";

  const configs = {
    development: {
      baseUrl: "http://localhost:3000",
      debugMode: true,
      cacheEnabled: false,
    },
    production: {
      baseUrl: process.env.PRODUCTION_URL,
      debugMode: false,
      cacheEnabled: true,
    },
  };

  return configs[environment] || configs.development;
};
```

---

### Frontend Issues

#### Problem: Next.js hydration mismatches

**Symptoms:**

- Hydration errors in browser console
- Content flashing on page load
- Component state inconsistencies

**Solutions:**

1. **Handle SSR/Client Differences**

```tsx
import { useEffect, useState } from "react";

// Custom hook for client-only rendering
export function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

// Usage in components
export function ClientOnlyComponent() {
  const isClient = useIsClient();

  if (!isClient) {
    return <div>Loading...</div>; // Server-side fallback
  }

  return (
    <div>
      {/* Client-only content */}
      <UserDashboard />
    </div>
  );
}
```

2. **Dynamic Imports for Client Components**

```tsx
import dynamic from "next/dynamic";

// Disable SSR for components that use browser APIs
const QRGenerator = dynamic(() => import("../components/QRGenerator"), {
  ssr: false,
  loading: () => <div>Loading QR Generator...</div>,
});

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <QRGenerator />
    </div>
  );
}
```

#### Problem: Build and deployment failures

**Symptoms:**

- TypeScript compilation errors
- Build process hangs
- Deployment timeouts

**Solutions:**

1. **Fix TypeScript Issues**

```bash
# Check for type errors
npx tsc --noEmit

# Generate types for Amplify
npx amplify codegen
```

2. **Optimize Build Process**

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Reduce bundle size
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ["@aws-amplify/ui-react"],
  },

  // Handle large dependencies
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-only packages from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;
```

---

## Debugging Tools and Techniques

### CloudWatch Logs Analysis

```bash
# View Lambda function logs
aws logs tail /aws/lambda/your-function-name --follow

# Filter logs by error level
aws logs filter-log-events \
  --log-group-name /aws/lambda/your-function-name \
  --filter-pattern "ERROR"

# Search for specific patterns
aws logs filter-log-events \
  --log-group-name /aws/lambda/your-function-name \
  --filter-pattern "{ $.level = \"error\" }"
```

### Network Request Debugging

```typescript
// Add request/response interceptors
import { Amplify } from "aws-amplify";

Amplify.configure({
  ...config,
  API: {
    GraphQL: {
      ...config.API.GraphQL,
      requestInterceptor: async (request) => {
        console.log("GraphQL Request:", {
          url: request.url,
          method: request.method,
          headers: request.headers,
          body: request.body,
        });
        return request;
      },
      responseInterceptor: async (response) => {
        console.log("GraphQL Response:", {
          status: response.status,
          headers: response.headers,
          body: await response.clone().text(),
        });
        return response;
      },
    },
  },
});
```

### Performance Monitoring

```typescript
// Performance monitoring utility
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  startTimer(operation: string): () => void {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);
    };
  }

  async measureAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const stopTimer = this.startTimer(operation);
    try {
      const result = await fn();
      stopTimer();
      return result;
    } catch (error) {
      stopTimer();
      throw error;
    }
  }

  private recordMetric(operation: string, duration: number) {
    const existing = this.metrics.get(operation) || [];
    existing.push(duration);

    // Keep only last 100 measurements
    if (existing.length > 100) {
      existing.shift();
    }

    this.metrics.set(operation, existing);

    // Log slow operations
    if (duration > 5000) {
      // 5 seconds
      console.warn(
        `Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`,
      );
    }
  }

  getStats(operation: string) {
    const measurements = this.metrics.get(operation) || [];
    if (measurements.length === 0) return null;

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = measurements.reduce((a, b) => a + b, 0);

    return {
      count: measurements.length,
      average: sum / measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  logReport() {
    console.log("\n=== Performance Report ===");
    for (const [operation, _] of this.metrics) {
      const stats = this.getStats(operation);
      if (stats) {
        console.log(`${operation}:`, {
          avg: `${stats.average.toFixed(2)}ms`,
          p95: `${stats.p95.toFixed(2)}ms`,
          count: stats.count,
        });
      }
    }
    console.log("========================\n");
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();

// Usage
const result = await performanceMonitor.measureAsync(
  "createQRCode",
  async () => {
    return await client.models.QrItems.create(input);
  },
);
```

This comprehensive troubleshooting guide should help you diagnose and resolve the most common issues encountered when building AWS Amplify applications. Remember to always check the AWS Console logs and use proper error handling to make debugging easier.
