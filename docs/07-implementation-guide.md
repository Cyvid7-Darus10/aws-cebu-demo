# Step-by-Step Implementation Guide

## Prerequisites

Before starting, ensure you have:

### 1. AWS Account Setup

- Active AWS account with billing enabled
- IAM user with appropriate permissions
- AWS CLI configured (recommended)

### 2. Development Environment

- Node.js 18.x or later
- npm or yarn package manager
- Git version control
- Code editor (VS Code recommended)

### 3. Required Tools

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Install AWS CLI (optional but recommended)
# macOS
brew install awscli

# Windows
# Download from: https://aws.amazon.com/cli/

# Verify installations
amplify --version
aws --version
node --version
```

---

## Project Initialization

### Step 1: Create Next.js Project

```bash
# Create new Next.js project
npx create-next-app@latest my-aws-app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir false \
  --import-alias "@/*"

cd my-aws-app

# Initialize git repository
git init
git add .
git commit -m "Initial Next.js setup"
```

### Step 2: Initialize Amplify Project

```bash
# Initialize Amplify project
npx amplify init

# Install Amplify dependencies
npm install aws-amplify @aws-amplify/ui-react
npm install -D @aws-amplify/backend @aws-amplify/backend-cli
```

### Step 3: Project Structure Setup

Create the following directory structure:

```
my-aws-app/
├── amplify/
│   ├── auth/
│   ├── data/
│   ├── storage/
│   ├── functions/
│   └── backend.ts
├── app/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── types/
└── docs/
```

---

## Backend Configuration

### Step 1: Main Backend Configuration

Create the main backend configuration file:

```typescript
// amplify/backend.ts
import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource.js";
import { data } from "./data/resource.js";
import { storage } from "./storage/resource.js";
import { qrGenerateFn } from "./functions/qr-generate/resource.js";

const backend = defineBackend({
  auth,
  data,
  storage,
  qrGenerateFn,
});

// Add any additional backend customizations here
export default backend;
```

### Step 2: Authentication Setup

```typescript
// amplify/auth/resource.ts
import { defineAuth } from "@aws-amplify/backend";

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    email: {
      mutable: true,
      required: true,
    },
    name: {
      mutable: true,
      required: false,
    },
    phone_number: {
      mutable: true,
      required: false,
    },
  },
  passwordPolicy: {
    minLength: 8,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    requireUppercase: true,
  },
  // Enable account recovery
  accountRecovery: "EMAIL_ONLY",
  // Multi-factor authentication (optional)
  multifactor: {
    mode: "OPTIONAL",
    totp: true,
    sms: true,
  },
});
```

### Step 3: Database Schema Definition

```typescript
// amplify/data/resource.ts
import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  // Main QR items table
  QrItems: a
    .model({
      id: a.id().required(),
      targetUrl: a.string().required(),
      s3Key: a.string().required(),
      ownerSub: a.string(),
      title: a.string(),
      description: a.string(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime(),
      lastScanAt: a.datetime(),
      scanCount: a.integer().default(0),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(["read"]), // Allow public read for QR scanning
      allow.owner().to(["create", "read", "update", "delete"]),
    ])
    .secondaryIndexes((index) => [
      index("ownerSub").sortKeys(["createdAt"]).name("byOwner"),
      index("targetUrl").name("byTargetUrl"),
    ]),

  // QR scan tracking table
  QrScans: a
    .model({
      id: a.id().required(),
      qrId: a.string().required(),
      scanAt: a.datetime().required(),
      userAgent: a.string(),
      referer: a.string(),
      ipAddress: a.string(),
      country: a.string(),
      city: a.string(),
      device: a.string(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(["create", "read"]),
      allow.authenticated().to(["read"]),
    ])
    .secondaryIndexes((index) => [
      index("qrId").sortKeys(["scanAt"]).name("byQrId"),
    ]),

  // User profile table (optional)
  UserProfile: a
    .model({
      id: a.id().required(),
      email: a.string().required(),
      name: a.string(),
      avatar: a.string(),
      plan: a.string().default("free"),
      createdAt: a.datetime().required(),
      lastLoginAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner().to(["create", "read", "update", "delete"]),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
});
```

### Step 4: Storage Configuration

```typescript
// amplify/storage/resource.ts
import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "qrCodeStorage",
  access: (allow) => ({
    "qr-images/*": [
      // Allow authenticated users to read and write
      allow.authenticated.to(["read", "write"]),
      // Allow guests to read (for QR code serving)
      allow.guest.to(["read"]),
    ],
    "user-uploads/{entity_id}/*": [
      // Private user uploads
      allow.entity("identity").to(["read", "write", "delete"]),
    ],
    "public/*": [
      // Public assets
      allow.guest.to(["read"]),
      allow.authenticated.to(["read"]),
    ],
  }),
  // Configure lifecycle policies
  triggers: {
    onUpload: "processUpload",
    onDelete: "processDelete",
  },
});
```

### Step 5: Lambda Functions Setup

#### QR Generation Function

```typescript
// amplify/functions/qr-generate/resource.ts
import { defineFunction } from "@aws-amplify/backend";

export const qrGenerateFn = defineFunction({
  name: "qr-generate",
  entry: "./handler.ts",
  environment: {
    BASE_URL: process.env.BASE_URL || "http://localhost:3000",
  },
  runtime: 20, // Node.js 20.x
  timeoutSeconds: 30,
  memoryMB: 512,
});
```

```typescript
// amplify/functions/qr-generate/handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import QRCode from "qrcode";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { ulid } from "ulid";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  // Set up CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
    "Content-Type": "application/json",
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  try {
    const { targetUrl, qrId } = JSON.parse(event.body || "{}");

    if (!targetUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "targetUrl is required",
        }),
      };
    }

    const id = qrId || ulid();

    // Generate QR code tracking URL
    const baseUrl = process.env.BASE_URL;
    const trackingUrl = `${baseUrl}/qr/${id}`;

    // Generate QR code image
    const qrBuffer = await QRCode.toBuffer(trackingUrl, {
      type: "png",
      width: 512,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    });

    // Upload to S3
    const s3Key = `qr-images/${id}.png`;
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.AMPLIFY_STORAGE_BUCKET_NAME,
      Key: s3Key,
      Body: qrBuffer,
      ContentType: "image/png",
      CacheControl: "public, max-age=31536000", // 1 year cache
      Metadata: {
        qrId: id,
        targetUrl: targetUrl,
      },
    });

    await s3Client.send(uploadCommand);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          qrId: id,
          s3Key,
          trackingUrl,
          imageUrl: `https://${process.env.AMPLIFY_STORAGE_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`,
        },
      }),
    };
  } catch (error) {
    console.error("Error generating QR code:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to generate QR code",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
```

#### Install Dependencies for Lambda

```bash
# Navigate to the function directory
cd amplify/functions/qr-generate

# Install dependencies
npm init -y
npm install qrcode ulid @aws-sdk/client-s3
npm install -D @types/aws-lambda @types/qrcode

# Go back to root
cd ../../../
```

---

## Frontend Integration

### Step 1: Amplify Configuration

```typescript
// app/amplify-config.ts
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);

export default Amplify;
```

```tsx
// app/layout.tsx
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import "./globals.css";

Amplify.configure(outputs);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
```

### Step 2: Authentication Components

```tsx
// app/components/auth/AuthProvider.tsx
"use client";

import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

const customFormFields = {
  signUp: {
    email: {
      order: 1,
      placeholder: "Enter your email address",
    },
    name: {
      order: 2,
      placeholder: "Enter your full name",
    },
    password: {
      order: 3,
      placeholder: "Enter your password",
    },
    confirm_password: {
      order: 4,
      placeholder: "Confirm your password",
    },
  },
};

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Authenticator
      formFields={customFormFields}
      components={{
        Header: () => (
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              QR Code Generator
            </h1>
            <p className="text-gray-600">Create and track QR codes easily</p>
          </div>
        ),
      }}
    >
      {children}
    </Authenticator>
  );
}
```

### Step 3: Data Operations Hooks

```typescript
// app/hooks/useQRCodes.ts
import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";

const client = generateClient<Schema>();

export function useQRCodes() {
  const [qrCodes, setQrCodes] = useState<Schema["QrItems"]["type"][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQRCodes();

    // Subscribe to real-time updates
    const createSub = client.models.QrItems.onCreate().subscribe({
      next: ({ data }) => {
        setQrCodes((prev) => [data, ...prev]);
      },
    });

    const updateSub = client.models.QrItems.onUpdate().subscribe({
      next: ({ data }) => {
        setQrCodes((prev) =>
          prev.map((item) => (item.id === data.id ? data : item)),
        );
      },
    });

    const deleteSub = client.models.QrItems.onDelete().subscribe({
      next: ({ data }) => {
        setQrCodes((prev) => prev.filter((item) => item.id !== data.id));
      },
    });

    // Cleanup subscriptions
    return () => {
      createSub.unsubscribe();
      updateSub.unsubscribe();
      deleteSub.unsubscribe();
    };
  }, []);

  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      const { data } = await client.models.QrItems.list({
        filter: {
          isActive: {
            eq: true,
          },
        },
      });
      setQrCodes(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching QR codes:", err);
      setError("Failed to fetch QR codes");
    } finally {
      setLoading(false);
    }
  };

  const createQRCode = async (input: {
    targetUrl: string;
    title?: string;
    description?: string;
  }) => {
    try {
      const { data } = await client.models.QrItems.create({
        ...input,
        createdAt: new Date().toISOString(),
        scanCount: 0,
        isActive: true,
      });
      return { success: true, data };
    } catch (err) {
      console.error("Error creating QR code:", err);
      return { success: false, error: "Failed to create QR code" };
    }
  };

  const updateQRCode = async (
    id: string,
    updates: Partial<Schema["QrItems"]["type"]>,
  ) => {
    try {
      const { data } = await client.models.QrItems.update({
        id,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      return { success: true, data };
    } catch (err) {
      console.error("Error updating QR code:", err);
      return { success: false, error: "Failed to update QR code" };
    }
  };

  const deleteQRCode = async (id: string) => {
    try {
      await client.models.QrItems.update({
        id,
        isActive: false,
        updatedAt: new Date().toISOString(),
      });
      return { success: true };
    } catch (err) {
      console.error("Error deleting QR code:", err);
      return { success: false, error: "Failed to delete QR code" };
    }
  };

  return {
    qrCodes,
    loading,
    error,
    createQRCode,
    updateQRCode,
    deleteQRCode,
    refetch: fetchQRCodes,
  };
}
```

### Step 4: QR Code Components

```tsx
// app/components/qr/QRGenerator.tsx
"use client";

import { useState } from "react";
import { useQRCodes } from "../../hooks/useQRCodes";

export default function QRGenerator() {
  const [targetUrl, setTargetUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { createQRCode } = useQRCodes();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetUrl.trim()) return;

    setIsGenerating(true);
    try {
      const result = await createQRCode({
        targetUrl: targetUrl.trim(),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
      });

      if (result.success) {
        // Reset form
        setTargetUrl("");
        setTitle("");
        setDescription("");
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Generate QR Code
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="url"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Target URL *
          </label>
          <input
            type="url"
            id="url"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://example.com"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Title (Optional)
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My QR Code"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this QR code is for..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={!targetUrl.trim() || isGenerating}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? "Generating..." : "Generate QR Code"}
        </button>
      </form>
    </div>
  );
}
```

### Step 5: QR Code List Component

```tsx
// app/components/qr/QRList.tsx
"use client";

import { useQRCodes } from "../../hooks/useQRCodes";
import QRCard from "./QRCard";

export default function QRList() {
  const { qrCodes, loading, error } = useQRCodes();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (qrCodes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No QR codes created yet.</p>
        <p className="text-sm text-gray-400">
          Create your first QR code to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {qrCodes.map((qrCode) => (
        <QRCard key={qrCode.id} qrCode={qrCode} />
      ))}
    </div>
  );
}
```

### Step 6: Individual QR Card Component

```tsx
// app/components/qr/QRCard.tsx
"use client";

import { useState } from "react";
import { Schema } from "../../amplify/data/resource";

interface QRCardProps {
  qrCode: Schema["QrItems"]["type"];
}

export default function QRCard({ qrCode }: QRCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDownload = () => {
    if (qrCode.s3Key) {
      const link = document.createElement("a");
      link.href = `https://${process.env.NEXT_PUBLIC_STORAGE_BUCKET}/${qrCode.s3Key}`;
      link.download = `qr-code-${qrCode.id}.png`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrCode.targetUrl);
      // You could add a toast notification here
      console.log("URL copied to clipboard");
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="text-center mb-4">
        {qrCode.s3Key && !imageError ? (
          <div className="relative">
            {!imageLoaded && (
              <div className="w-48 h-48 bg-gray-200 animate-pulse rounded-lg mx-auto"></div>
            )}
            <img
              src={`https://${process.env.NEXT_PUBLIC_STORAGE_BUCKET}/${qrCode.s3Key}`}
              alt={qrCode.title || "QR Code"}
              className={`w-48 h-48 mx-auto rounded-lg ${imageLoaded ? "block" : "hidden"}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="w-48 h-48 bg-gray-200 flex items-center justify-center rounded-lg mx-auto">
            <span className="text-gray-500">No Image</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900 truncate">
          {qrCode.title || "Untitled QR Code"}
        </h3>

        {qrCode.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {qrCode.description}
          </p>
        )}

        <div className="text-xs text-gray-500">
          <p>Created: {formatDate(qrCode.createdAt)}</p>
          <p>Scans: {qrCode.scanCount || 0}</p>
          {qrCode.lastScanAt && (
            <p>Last scan: {formatDate(qrCode.lastScanAt)}</p>
          )}
        </div>

        <div className="pt-4 space-y-2">
          <button
            onClick={handleDownload}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            Download QR Code
          </button>

          <button
            onClick={handleCopyUrl}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-sm"
          >
            Copy Target URL
          </button>
        </div>

        <div className="text-xs text-gray-400 break-all">
          {qrCode.targetUrl}
        </div>
      </div>
    </div>
  );
}
```

---

## Deployment

### Step 1: Deploy Backend to AWS

```bash
# Deploy backend resources to AWS
npx amplify sandbox

# For production deployment
npx amplify pipeline-deploy --branch main
```

### Step 2: Build and Test Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Step 3: Deploy Frontend

```bash
# Deploy to Amplify Hosting
npx amplify add hosting

# Choose Amplify Console for hosting
npx amplify publish
```

### Step 4: Environment Configuration

Create environment-specific configuration:

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["aws-sdk"],
  },
  images: {
    domains: [
      process.env.NEXT_PUBLIC_STORAGE_BUCKET ||
        "your-bucket-name.s3.amazonaws.com",
    ],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

module.exports = nextConfig;
```

---

## Testing

### Step 1: Unit Testing Setup

```bash
# Install testing dependencies
npm install -D jest @testing-library/react @testing-library/jest-dom
npm install -D jest-environment-jsdom
```

Create test configuration:

```javascript
// jest.config.js
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapping: {
    "^@/components/(.*)$": "<rootDir>/components/$1",
    "^@/pages/(.*)$": "<rootDir>/pages/$1",
  },
  testEnvironment: "jest-environment-jsdom",
};

module.exports = createJestConfig(customJestConfig);
```

```javascript
// jest.setup.js
import "@testing-library/jest-dom";
```

### Step 2: Component Testing

```typescript
// __tests__/components/QRGenerator.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QRGenerator from '../app/components/qr/QRGenerator';

// Mock the useQRCodes hook
jest.mock('../app/hooks/useQRCodes', () => ({
  useQRCodes: () => ({
    createQRCode: jest.fn().mockResolvedValue({ success: true }),
  }),
}));

describe('QRGenerator', () => {
  it('renders form elements correctly', () => {
    render(<QRGenerator />);

    expect(screen.getByLabelText(/target url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate qr code/i })).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    render(<QRGenerator />);

    const urlInput = screen.getByLabelText(/target url/i);
    const submitButton = screen.getByRole('button', { name: /generate qr code/i });

    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(urlInput).toHaveValue('');
    });
  });
});
```

### Step 3: Integration Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

---

## Monitoring and Analytics

### Step 1: Set Up CloudWatch Monitoring

The Amplify backend automatically sets up basic monitoring. You can access logs and metrics through the AWS Console.

### Step 2: Add Custom Analytics (Optional)

```typescript
// utils/analytics.ts
import { record } from "aws-amplify/analytics";

export const trackQRCodeCreated = (qrId: string, targetUrl: string) => {
  record({
    name: "qr_code_created",
    attributes: {
      qr_id: qrId,
      target_domain: new URL(targetUrl).hostname,
    },
  });
};

export const trackQRCodeScanned = (qrId: string, userAgent?: string) => {
  record({
    name: "qr_code_scanned",
    attributes: {
      qr_id: qrId,
      user_agent: userAgent || "unknown",
    },
  });
};
```

---

## Next Steps

After completing this implementation:

1. **Security Review**: Review IAM policies and access controls
2. **Performance Testing**: Test with expected load patterns
3. **Cost Monitoring**: Set up billing alerts and cost monitoring
4. **User Feedback**: Gather user feedback and iterate
5. **Advanced Features**: Add features like custom domains, analytics dashboard
6. **Documentation**: Document your API and deployment processes

Your MVP is now ready for production! 🚀
