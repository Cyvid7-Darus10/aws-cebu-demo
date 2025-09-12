# Demo Steps: Ship This Weekend

[← Back: Case Study](03-case-study.md) | [Next: Architecture →](05-architecture.md)

---

## Weekend Timeline

```mermaid
gantt
    title Weekend MVP Timeline
    dateFormat  X
    axisFormat  %s

    section Saturday
    Setup & Deploy     :0, 2h
    Auth & Data       :2h, 4h
    Core Features     :4h, 6h

    section Sunday
    Polish & Test     :0, 2h
    Deploy Production :2h, 3h
    Share with Users  :3h, 4h
```

**Total Time**: 10-12 hours over 2 days  
**Skill Level**: Beginner to Intermediate  
**Cost**: $0-5 (within free tier)

---

## Saturday Morning: Foundation (2 hours)

### Step 1: AWS Account Setup (30 minutes)

```bash
# 1. Create AWS account (if new)
# Visit: https://aws.amazon.com/free
# Sign up with email and credit card (for verification only)

# 2. Set up billing alerts immediately
aws budgets create-budget \
    --account-id $(aws sts get-caller-identity --query Account --output text) \
    --budget '{
        "BudgetName": "Weekend MVP Budget",
        "BudgetLimit": {"Amount": "10", "Unit": "USD"},
        "TimeUnit": "MONTHLY",
        "BudgetType": "COST"
    }'
```

**⚠️ Critical:** Set billing alerts before creating any resources!

### Step 2: Project Setup (45 minutes)

```bash
# Create Next.js app
npx create-next-app@latest qr-generator \
    --typescript \
    --tailwind \
    --eslint \
    --app \
    --src-dir=false \
    --import-alias="@/*"

cd qr-generator

# Initialize Git
git init
git add .
git commit -m "Initial commit"

# Create GitHub repository
gh repo create qr-generator --public --push
```

### Step 3: Amplify Deployment (45 minutes)

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure Amplify (if first time)
amplify configure

# Initialize Amplify project
amplify init
# Choose defaults, select your AWS profile

# Add hosting
amplify add hosting
# Select "Amazon CloudFront and S3"
```

**Amplify Console Setup:**

1. Visit AWS Amplify Console
2. Click "Connect app"
3. Choose GitHub provider
4. Select your repository
5. Accept build settings
6. Deploy!

**Verify:** Your app is live at `https://RANDOM.amplifyapp.com`

---

## Saturday Afternoon: Authentication & Data (4 hours)

### Step 4: Authentication Setup (1 hour)

```bash
# Add authentication
amplify add auth
# Choose: Default configuration
# Username: Email
# Advanced settings: No
```

```typescript
// lib/amplify-config.ts
import { Amplify } from "aws-amplify";
import config from "@/amplifyconfiguration.json";

Amplify.configure(config);

export default Amplify;
```

```tsx
// app/layout.tsx
import "@/lib/amplify-config";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Authenticator>{children}</Authenticator>
      </body>
    </html>
  );
}
```

### Step 5: Database Schema (1 hour)

```bash
# Add GraphQL API
amplify add api
# Choose: GraphQL
# Authorization: Amazon Cognito User Pool
# Schema: Yes, I want to edit it
```

```graphql
# amplify/backend/api/schema.graphql
type QrItem @model @auth(rules: [{ allow: owner }]) {
  id: ID!
  targetUrl: String!
  s3Key: String!
  createdAt: AWSDateTime!
  lastScanAt: AWSDateTime
  scanCount: Int @default(value: 0)
}

type QrScan @model @auth(rules: [{ allow: public, provider: apiKey }]) {
  id: ID!
  qrId: String! @index
  scanAt: AWSDateTime!
  userAgent: String
  referer: String
  ipAddress: String
}
```

### Step 6: Storage for QR Images (30 minutes)

```bash
# Add S3 storage
amplify add storage
# Choose: Content (Images, audio, video, etc.)
# Bucket name: Accept default
# Access: Auth and guest users can read, only auth users can write
```

### Step 7: Lambda Functions (1.5 hours)

```bash
# Add Lambda function for QR generation
amplify add function
# Function name: generateQr
# Runtime: NodeJS
# Template: Hello World
```

```typescript
// amplify/backend/function/generateQr/src/index.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import QRCode from "qrcode";
import AWS from "aws-sdk";

const s3 = new AWS.S3();

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const { targetUrl, qrId } = JSON.parse(event.body || "{}");

    // Generate QR code
    const qrCodeUrl = `${process.env.BASE_URL}/qr/${qrId}`;
    const qrBuffer = await QRCode.toBuffer(qrCodeUrl, {
      type: "png",
      width: 512,
      margin: 2,
    });

    // Upload to S3
    const s3Key = `qr-codes/${qrId}.png`;
    await s3
      .upload({
        Bucket: process.env.STORAGE_BUCKET_NAME!,
        Key: s3Key,
        Body: qrBuffer,
        ContentType: "image/png",
      })
      .promise();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({
        s3Key,
        qrCodeUrl,
        success: true,
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Failed to generate QR code" }),
    };
  }
};
```

```bash
# Install dependencies
cd amplify/backend/function/generateQr/src
npm install qrcode aws-sdk
cd ../../../../../

# Deploy everything
amplify push
```

---

## Saturday Evening: Core Features (2 hours)

### Step 8: QR Generator Component (1 hour)

```tsx
// components/QRGenerator.tsx
"use client";

import { useState } from "react";
import { generateClient } from "aws-amplify/data";
import { uploadData } from "aws-amplify/storage";

const client = generateClient();

export default function QRGenerator() {
  const [targetUrl, setTargetUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrResult, setQrResult] = useState<any>(null);

  const generateQR = async () => {
    if (!targetUrl.trim()) return;

    setIsGenerating(true);
    try {
      // Create QR item in database
      const qrItem = await client.models.QrItem.create({
        targetUrl: targetUrl.trim(),
        s3Key: "", // Will be updated after generation
      });

      if (qrItem.data) {
        // Call Lambda to generate QR code
        const response = await fetch("/api/generate-qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetUrl: targetUrl.trim(),
            qrId: qrItem.data.id,
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Update QR item with S3 key
          await client.models.QrItem.update({
            id: qrItem.data.id,
            s3Key: result.s3Key,
          });

          setQrResult({
            id: qrItem.data.id,
            targetUrl,
            qrCodeUrl: result.qrCodeUrl,
            s3Key: result.s3Key,
          });
        }
      }
    } catch (error) {
      console.error("Failed to generate QR:", error);
      alert("Failed to generate QR code");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Generate QR Code</h2>

      <div className="space-y-4">
        <input
          type="url"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="Enter URL (https://example.com)"
          className="w-full p-3 border rounded-md"
        />

        <button
          onClick={generateQR}
          disabled={isGenerating || !targetUrl.trim()}
          className="w-full p-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isGenerating ? "Generating..." : "Generate QR Code"}
        </button>
      </div>

      {qrResult && (
        <div className="mt-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Your QR Code</h3>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600 mb-2">
              Scan this QR code or visit:
            </p>
            <p className="font-mono text-sm break-all">{qrResult.qrCodeUrl}</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Step 9: Dashboard Page (1 hour)

```tsx
// app/dashboard/page.tsx
import QRGenerator from "@/components/QRGenerator";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          QR Code Generator
        </h1>

        <QRGenerator />

        <div className="mt-8 text-center text-gray-600">
          <p>Create trackable QR codes for your business</p>
        </div>
      </div>
    </div>
  );
}
```

**Test your app:** Visit your dashboard and generate your first QR code!

---

## Sunday Morning: Polish & Features (2 hours)

### Step 10: QR Code Tracking (1 hour)

```tsx
// app/qr/[id]/page.tsx
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { generateClient } from "aws-amplify/data";

const client = generateClient();

export default function QRTracker() {
  const params = useParams();
  const router = useRouter();
  const qrId = params.id as string;

  useEffect(() => {
    const trackAndRedirect = async () => {
      try {
        // Get QR item
        const qrItem = await client.models.QrItem.get({ id: qrId });

        if (qrItem.data) {
          // Record scan
          await client.models.QrScan.create({
            qrId,
            scanAt: new Date().toISOString(),
            userAgent: navigator.userAgent,
            referer: document.referrer,
          });

          // Update scan count
          const newCount = (qrItem.data.scanCount || 0) + 1;
          await client.models.QrItem.update({
            id: qrId,
            scanCount: newCount,
            lastScanAt: new Date().toISOString(),
          });

          // Redirect to target URL
          window.location.href = qrItem.data.targetUrl;
        } else {
          router.push("/404");
        }
      } catch (error) {
        console.error("Tracking failed:", error);
        router.push("/404");
      }
    };

    if (qrId) {
      trackAndRedirect();
    }
  }, [qrId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
```

### Step 11: QR History List (1 hour)

```tsx
// components/QRList.tsx
"use client";

import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";

const client = generateClient();

export default function QRList() {
  const [qrItems, setQrItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQRItems = async () => {
      try {
        const response = await client.models.QrItem.list();
        setQrItems(response.data || []);
      } catch (error) {
        console.error("Failed to fetch QR items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQRItems();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Your QR Codes</h3>

      {qrItems.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No QR codes created yet. Generate your first one above!
        </p>
      ) : (
        <div className="space-y-4">
          {qrItems.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-blue-600 hover:text-blue-800">
                    <a
                      href={item.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.targetUrl}
                    </a>
                  </p>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-700">
                    Scans: {item.scanCount || 0}
                    {item.lastScanAt && (
                      <span className="text-gray-500">
                        {" "}
                        (Last: {new Date(item.lastScanAt).toLocaleDateString()})
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <a
                    href={`/qr/${item.id}`}
                    target="_blank"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    View QR →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Sunday Afternoon: Deploy & Share (3 hours)

### Step 12: Final Testing (1 hour)

```bash
# Test locally
npm run dev

# Check all features:
# ✅ User can sign up/login
# ✅ User can generate QR codes
# ✅ QR codes redirect properly
# ✅ Scan tracking works
# ✅ Dashboard shows QR history
```

### Step 13: Production Deploy (1 hour)

```bash
# Deploy all changes
amplify push

# Commit and push to GitHub
git add .
git commit -m "Complete MVP implementation"
git push origin main

# Amplify automatically deploys from main branch
```

**Verify production:**

- Visit your Amplify app URL
- Test complete user journey
- Check mobile responsiveness

### Step 14: Share with Users (1 hour)

**Create your first QR code:**

1. Generate QR for your LinkedIn profile
2. Test the tracking functionality
3. Share with friends/colleagues

**Gather feedback:**

- Share app URL with 5-10 people
- Ask them to create account and try it
- Note any issues or suggestions
- Document feedback for next iteration

---

## Weekend Complete! 🎉

**What You've Built:**

- ✅ Full-stack web application
- ✅ User authentication system
- ✅ QR code generation and storage
- ✅ Tracking and analytics
- ✅ Mobile-responsive UI
- ✅ Production deployment

**What You've Learned:**

- ✅ AWS Amplify development
- ✅ Serverless architecture
- ✅ React/Next.js patterns
- ✅ Database design
- ✅ Cost monitoring

**Total Cost:** $0-3 (within free tier limits)

---

## Next Steps

**Week 2:** Polish based on user feedback  
**Week 3:** Add advanced features  
**Week 4:** Plan monetization strategy

**Remember:** You've just shipped a real product that solves a real problem. That's more than most people ever do!

---

[← Back: Case Study](03-case-study.md) | [Next: Architecture →](05-architecture.md)
