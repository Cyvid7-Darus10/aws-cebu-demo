# Advanced Patterns

## Real-time Data with Subscriptions

### GraphQL Subscriptions with AppSync

Real-time data synchronization is crucial for modern applications. AWS AppSync provides built-in GraphQL subscriptions that work seamlessly with DynamoDB and Lambda.

```typescript
// hooks/useRealtimeQRCodes.ts
import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";

const client = generateClient<Schema>();

export function useRealtimeQRCodes() {
  const [qrCodes, setQrCodes] = useState<Schema["QrItems"]["type"][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial data fetch
    const fetchInitialData = async () => {
      try {
        const { data } = await client.models.QrItems.list({
          filter: { isActive: { eq: true } },
        });
        setQrCodes(data);
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Set up real-time subscriptions
    const createSub = client.models.QrItems.onCreate({
      filter: { isActive: { eq: true } },
    }).subscribe({
      next: ({ data }) => {
        console.log("New QR code created:", data);
        setQrCodes((prev) => [data, ...prev]);

        // Optional: Show notification
        showNotification(`New QR code created: ${data.title || "Untitled"}`);
      },
      error: (error) => {
        console.error("Subscription error:", error);
      },
    });

    const updateSub = client.models.QrItems.onUpdate({
      filter: { isActive: { eq: true } },
    }).subscribe({
      next: ({ data }) => {
        console.log("QR code updated:", data);
        setQrCodes((prev) =>
          prev.map((item) => (item.id === data.id ? data : item)),
        );
      },
    });

    const deleteSub = client.models.QrItems.onDelete().subscribe({
      next: ({ data }) => {
        console.log("QR code deleted:", data);
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

  return { qrCodes, loading };
}
```

### WebSocket Connection Management

```typescript
// utils/websocket.ts
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor(private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const handler = this.messageHandlers.get(message.type);
          handler?.(message.data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.ws.onclose = () => {
        console.log("WebSocket disconnected");
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      };
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      );
      this.connect().catch(console.error);
    }, delay);
  }

  subscribe(messageType: string, handler: (data: any) => void) {
    this.messageHandlers.set(messageType, handler);
  }

  unsubscribe(messageType: string) {
    this.messageHandlers.delete(messageType);
  }

  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected, message not sent:", message);
    }
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.messageHandlers.clear();
  }
}
```

---

## Custom GraphQL Resolvers

### Lambda-based Custom Resolvers

For complex business logic that can't be handled by simple DynamoDB operations, you can create custom GraphQL resolvers backed by Lambda functions.

```typescript
// amplify/data/custom-queries.ts
import { a } from "@aws-amplify/backend";

export const customQueries = a.schema({
  // Custom query for advanced QR analytics
  getQRAnalytics: a
    .query()
    .arguments({
      qrId: a.string().required(),
      startDate: a.string().required(),
      endDate: a.string().required(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(
      a.handler.custom({
        entry: "./analytics-resolver.js",
      }),
    ),

  // Bulk operations
  bulkCreateQRCodes: a
    .mutation()
    .arguments({
      qrData: a.json().required(), // Array of QR code data
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(
      a.handler.custom({
        entry: "./bulk-operations-resolver.js",
      }),
    ),

  // Search functionality
  searchQRCodes: a
    .query()
    .arguments({
      query: a.string().required(),
      filters: a.json(),
      limit: a.integer(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.authenticated()])
    .handler(
      a.handler.custom({
        entry: "./search-resolver.js",
      }),
    ),
});
```

### Analytics Resolver Implementation

```typescript
// amplify/data/analytics-resolver.ts
import { AppSyncResolverEvent, AppSyncResolverHandler } from "aws-lambda";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });

interface AnalyticsArgs {
  qrId: string;
  startDate: string;
  endDate: string;
}

interface AnalyticsResult {
  totalScans: number;
  uniqueVisitors: number;
  topCountries: Array<{ country: string; count: number }>;
  dailyScans: Array<{ date: string; count: number }>;
  deviceBreakdown: Array<{ device: string; count: number }>;
  referrerBreakdown: Array<{ referrer: string; count: number }>;
}

export const handler: AppSyncResolverHandler<
  AnalyticsArgs,
  AnalyticsResult
> = async (event) => {
  console.log("Analytics resolver called:", JSON.stringify(event, null, 2));

  const { qrId, startDate, endDate } = event.arguments;

  try {
    // Query scan data from DynamoDB
    const scanData = await queryScansInDateRange(qrId, startDate, endDate);

    // Process and aggregate data
    const analytics = await processAnalyticsData(scanData);

    return analytics;
  } catch (error) {
    console.error("Error in analytics resolver:", error);
    throw new Error("Failed to fetch analytics data");
  }
};

async function queryScansInDateRange(
  qrId: string,
  startDate: string,
  endDate: string,
) {
  const command = new QueryCommand({
    TableName: process.env.DYNAMODB_TABLE_NAME,
    IndexName: "byQrId", // GSI for querying by QR ID
    KeyConditionExpression:
      "qrId = :qrId AND scanAt BETWEEN :startDate AND :endDate",
    ExpressionAttributeValues: {
      ":qrId": { S: qrId },
      ":startDate": { S: startDate },
      ":endDate": { S: endDate },
    },
  });

  const result = await dynamodb.send(command);
  return result.Items?.map((item) => unmarshall(item)) || [];
}

async function processAnalyticsData(scans: any[]): Promise<AnalyticsResult> {
  // Calculate total scans
  const totalScans = scans.length;

  // Calculate unique visitors (by IP address)
  const uniqueIps = new Set(
    scans.map((scan) => scan.ipAddress).filter(Boolean),
  );
  const uniqueVisitors = uniqueIps.size;

  // Top countries
  const countryCount = new Map<string, number>();
  scans.forEach((scan) => {
    if (scan.country) {
      countryCount.set(scan.country, (countryCount.get(scan.country) || 0) + 1);
    }
  });

  const topCountries = Array.from(countryCount.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Daily scans
  const dailyCount = new Map<string, number>();
  scans.forEach((scan) => {
    const date = scan.scanAt.split("T")[0]; // Extract date part
    dailyCount.set(date, (dailyCount.get(date) || 0) + 1);
  });

  const dailyScans = Array.from(dailyCount.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Device breakdown
  const deviceCount = new Map<string, number>();
  scans.forEach((scan) => {
    if (scan.device) {
      deviceCount.set(scan.device, (deviceCount.get(scan.device) || 0) + 1);
    }
  });

  const deviceBreakdown = Array.from(deviceCount.entries())
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count);

  // Referrer breakdown
  const referrerCount = new Map<string, number>();
  scans.forEach((scan) => {
    const referrer = scan.referer || "Direct";
    referrerCount.set(referrer, (referrerCount.get(referrer) || 0) + 1);
  });

  const referrerBreakdown = Array.from(referrerCount.entries())
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalScans,
    uniqueVisitors,
    topCountries,
    dailyScans,
    deviceBreakdown,
    referrerBreakdown,
  };
}
```

---

## Advanced Storage Patterns

### Multi-tier Storage Strategy

```typescript
// utils/storage-manager.ts
import { uploadData, getUrl, remove, list } from "aws-amplify/storage";
import {
  S3Client,
  CopyObjectCommand,
  PutObjectTaggingCommand,
} from "@aws-sdk/client-s3";

export enum StorageTier {
  HOT = "STANDARD",
  WARM = "STANDARD_IA",
  COLD = "GLACIER",
  ARCHIVE = "DEEP_ARCHIVE",
}

export class AdvancedStorageManager {
  private s3Client = new S3Client({ region: process.env.AWS_REGION });

  /**
   * Upload file with automatic tiering based on predicted access patterns
   */
  async uploadWithTiering(
    key: string,
    data: File | Blob,
    options: {
      tier?: StorageTier;
      tags?: Record<string, string>;
      metadata?: Record<string, string>;
    } = {},
  ) {
    const { tier = StorageTier.HOT, tags, metadata } = options;

    // Upload to S3
    const result = await uploadData({
      key,
      data,
      options: {
        contentType:
          data instanceof File ? data.type : "application/octet-stream",
        metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
          tier: tier,
        },
      },
    }).result;

    // Add tags for lifecycle management
    if (tags) {
      await this.addObjectTags(key, {
        ...tags,
        StorageTier: tier,
        CreatedBy: "QRCodeApp",
      });
    }

    return result;
  }

  /**
   * Generate signed URLs with different expiration times based on storage tier
   */
  async getSignedUrl(key: string, expiresIn?: number) {
    // Determine expiration based on usage patterns
    const defaultExpiration = await this.calculateOptimalExpiration(key);
    const finalExpiration = expiresIn || defaultExpiration;

    return getUrl({
      key,
      options: {
        expiresIn: finalExpiration,
        useAccelerateEndpoint: true, // Use CloudFront acceleration
      },
    });
  }

  /**
   * Intelligent cleanup based on access patterns
   */
  async cleanupUnusedFiles(olderThanDays: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { items } = await list({
      prefix: "qr-images/",
      options: {
        listAll: true,
      },
    });

    const itemsToDelete = items.filter(
      (item) => item.lastModified && item.lastModified < cutoffDate,
    );

    const deletePromises = itemsToDelete.map((item) =>
      this.archiveOrDelete(item.key!, olderThanDays),
    );

    await Promise.all(deletePromises);

    return {
      processed: itemsToDelete.length,
      deleted: deletePromises.length,
    };
  }

  private async calculateOptimalExpiration(key: string): Promise<number> {
    // Analyze access patterns to determine optimal expiration
    // For QR codes that are accessed frequently, use longer expiration
    // For one-time use codes, use shorter expiration

    // Default to 1 hour, but can be made smarter with analytics
    return 3600;
  }

  private async addObjectTags(key: string, tags: Record<string, string>) {
    const bucketName = process.env.AMPLIFY_STORAGE_BUCKET_NAME;

    const tagSet = Object.entries(tags).map(([Key, Value]) => ({ Key, Value }));

    const command = new PutObjectTaggingCommand({
      Bucket: bucketName,
      Key: key,
      Tagging: { TagSet: tagSet },
    });

    await this.s3Client.send(command);
  }

  private async archiveOrDelete(key: string, age: number) {
    if (age > 365) {
      // Delete very old files
      await remove({ key });
    } else if (age > 90) {
      // Move to archive tier
      await this.moveToArchive(key);
    }
    // Files younger than 90 days are left in standard tier
  }

  private async moveToArchive(key: string) {
    const bucketName = process.env.AMPLIFY_STORAGE_BUCKET_NAME;

    // Copy object to archive tier
    const copyCommand = new CopyObjectCommand({
      Bucket: bucketName,
      Key: key,
      CopySource: `${bucketName}/${key}`,
      StorageClass: StorageTier.ARCHIVE,
    });

    await this.s3Client.send(copyCommand);
  }
}
```

### Image Processing Pipeline

```typescript
// utils/image-processor.ts
import sharp from "sharp";
import { uploadData } from "aws-amplify/storage";

export interface ImageVariant {
  width: number;
  height: number;
  suffix: string;
  quality?: number;
  format?: "png" | "jpeg" | "webp";
}

export class ImageProcessor {
  private variants: ImageVariant[] = [
    { width: 256, height: 256, suffix: "_thumb", quality: 80, format: "jpeg" },
    { width: 512, height: 512, suffix: "_medium", quality: 90, format: "png" },
    { width: 1024, height: 1024, suffix: "_large", quality: 95, format: "png" },
    {
      width: 256,
      height: 256,
      suffix: "_thumb_webp",
      quality: 80,
      format: "webp",
    },
  ];

  async processQRCodeImage(
    originalBuffer: Buffer,
    baseKey: string,
  ): Promise<{ variants: Array<{ key: string; url: string }> }> {
    const results = await Promise.all(
      this.variants.map((variant) =>
        this.createVariant(originalBuffer, baseKey, variant),
      ),
    );

    return { variants: results };
  }

  private async createVariant(
    buffer: Buffer,
    baseKey: string,
    variant: ImageVariant,
  ) {
    const processedBuffer = await sharp(buffer)
      .resize(variant.width, variant.height, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .toFormat(variant.format || "png", {
        quality: variant.quality,
      })
      .toBuffer();

    const key = baseKey.replace(
      ".png",
      `${variant.suffix}.${variant.format || "png"}`,
    );

    const result = await uploadData({
      key,
      data: new Blob([processedBuffer], {
        type: `image/${variant.format || "png"}`,
      }),
      options: {
        contentType: `image/${variant.format || "png"}`,
        metadata: {
          width: variant.width.toString(),
          height: variant.height.toString(),
          variant: variant.suffix,
        },
      },
    }).result;

    return {
      key,
      url: result.url?.toString() || "",
    };
  }

  async optimizeForWeb(imageBuffer: Buffer): Promise<{
    webp: Buffer;
    jpeg: Buffer;
    png: Buffer;
  }> {
    const [webp, jpeg, png] = await Promise.all([
      sharp(imageBuffer).webp({ quality: 85 }).toBuffer(),
      sharp(imageBuffer).jpeg({ quality: 90, progressive: true }).toBuffer(),
      sharp(imageBuffer).png({ compressionLevel: 9 }).toBuffer(),
    ]);

    return { webp, jpeg, png };
  }
}
```

---

## Event-Driven Architecture

### Lambda Event Processing

```typescript
// amplify/functions/event-processor/handler.ts
import { DynamoDBStreamEvent, DynamoDBRecord } from "aws-lambda";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const snsClient = new SNSClient({ region: process.env.AWS_REGION });
const sesClient = new SESClient({ region: process.env.AWS_REGION });

export const handler = async (event: DynamoDBStreamEvent) => {
  console.log(
    "Processing DynamoDB stream events:",
    JSON.stringify(event, null, 2),
  );

  for (const record of event.Records) {
    await processRecord(record);
  }
};

async function processRecord(record: DynamoDBRecord) {
  switch (record.eventName) {
    case "INSERT":
      await handleNewQRCode(record);
      break;
    case "MODIFY":
      await handleQRCodeUpdate(record);
      break;
    case "REMOVE":
      await handleQRCodeDeletion(record);
      break;
  }
}

async function handleNewQRCode(record: DynamoDBRecord) {
  const newImage = record.dynamodb?.NewImage;
  if (!newImage) return;

  const qrCode = {
    id: newImage.id?.S,
    title: newImage.title?.S,
    ownerSub: newImage.ownerSub?.S,
    targetUrl: newImage.targetUrl?.S,
    createdAt: newImage.createdAt?.S,
  };

  // Send welcome email to user
  await sendWelcomeEmail(qrCode);

  // Publish event for analytics
  await publishAnalyticsEvent("qr_code_created", {
    qrId: qrCode.id,
    userId: qrCode.ownerSub,
    targetDomain: extractDomain(qrCode.targetUrl),
  });

  // Trigger backup process
  await triggerBackup(qrCode.id);
}

async function handleQRCodeUpdate(record: DynamoDBRecord) {
  const newImage = record.dynamodb?.NewImage;
  const oldImage = record.dynamodb?.OldImage;

  if (!newImage || !oldImage) return;

  // Check if scan count increased
  const oldScanCount = parseInt(oldImage.scanCount?.N || "0");
  const newScanCount = parseInt(newImage.scanCount?.N || "0");

  if (newScanCount > oldScanCount) {
    await handleNewScan({
      qrId: newImage.id?.S,
      scanCount: newScanCount,
      ownerSub: newImage.ownerSub?.S,
    });
  }
}

async function handleQRCodeDeletion(record: DynamoDBRecord) {
  const oldImage = record.dynamodb?.OldImage;
  if (!oldImage) return;

  // Clean up associated resources
  await cleanupQRCodeResources(oldImage.id?.S, oldImage.s3Key?.S);
}

async function sendWelcomeEmail(qrCode: any) {
  if (!qrCode.ownerSub) return;

  // Get user email from Cognito or user profile
  const userEmail = await getUserEmail(qrCode.ownerSub);
  if (!userEmail) return;

  const emailCommand = new SendEmailCommand({
    Source: process.env.FROM_EMAIL,
    Destination: {
      ToAddresses: [userEmail],
    },
    Message: {
      Subject: {
        Data: "QR Code Created Successfully!",
      },
      Body: {
        Html: {
          Data: `
            <h2>Your QR Code is Ready!</h2>
            <p>Hi there!</p>
            <p>Your QR code "${qrCode.title || "Untitled"}" has been created successfully.</p>
            <p>Target URL: ${qrCode.targetUrl}</p>
            <p>Created: ${qrCode.createdAt}</p>
            <p>You can manage your QR codes in your <a href="${process.env.APP_URL}/dashboard">dashboard</a>.</p>
          `,
        },
      },
    },
  });

  await sesClient.send(emailCommand);
}

async function publishAnalyticsEvent(eventType: string, data: any) {
  const message = {
    eventType,
    timestamp: new Date().toISOString(),
    data,
  };

  const command = new PublishCommand({
    TopicArn: process.env.ANALYTICS_TOPIC_ARN,
    Message: JSON.stringify(message),
    Subject: `QR App Event: ${eventType}`,
  });

  await snsClient.send(command);
}

async function handleNewScan(scanData: any) {
  // Send milestone notifications
  if (scanData.scanCount === 10 || scanData.scanCount % 100 === 0) {
    await sendMilestoneNotification(scanData);
  }

  // Update user engagement metrics
  await updateUserEngagement(scanData.ownerSub, scanData.scanCount);
}

async function getUserEmail(userSub: string): Promise<string | null> {
  // Implementation to get user email from Cognito or user profile table
  return null; // Placeholder
}

async function extractDomain(url?: string): string {
  if (!url) return "unknown";
  try {
    return new URL(url).hostname;
  } catch {
    return "invalid-url";
  }
}

async function triggerBackup(qrId?: string) {
  // Trigger backup process for important QR codes
  console.log(`Triggering backup for QR code: ${qrId}`);
}

async function cleanupQRCodeResources(qrId?: string, s3Key?: string) {
  // Clean up S3 objects and other resources
  console.log(`Cleaning up resources for QR code: ${qrId}, S3 key: ${s3Key}`);
}

async function sendMilestoneNotification(scanData: any) {
  // Send congratulations email for scan milestones
  console.log(
    `Milestone reached for QR code: ${scanData.qrId} - ${scanData.scanCount} scans`,
  );
}

async function updateUserEngagement(userSub?: string, totalScans?: number) {
  // Update user engagement metrics in analytics database
  console.log(
    `Updating engagement for user: ${userSub}, total scans: ${totalScans}`,
  );
}
```

### Event Bus Integration

```typescript
// utils/event-bus.ts
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";

export interface AppEvent {
  source: string;
  detailType: string;
  detail: any;
  resources?: string[];
}

export class EventBus {
  private client = new EventBridgeClient({ region: process.env.AWS_REGION });
  private eventBusName = process.env.EVENT_BUS_NAME || "default";

  async publish(event: AppEvent) {
    const command = new PutEventsCommand({
      Entries: [
        {
          Source: event.source,
          DetailType: event.detailType,
          Detail: JSON.stringify(event.detail),
          Resources: event.resources,
          EventBusName: this.eventBusName,
        },
      ],
    });

    const result = await this.client.send(command);
    console.log("Event published:", result);
    return result;
  }

  // Predefined event types
  async publishQRCodeCreated(qrCode: any) {
    return this.publish({
      source: "qr-app.qr-codes",
      detailType: "QR Code Created",
      detail: {
        qrId: qrCode.id,
        userId: qrCode.ownerSub,
        title: qrCode.title,
        targetUrl: qrCode.targetUrl,
        createdAt: qrCode.createdAt,
      },
    });
  }

  async publishQRCodeScanned(scanData: any) {
    return this.publish({
      source: "qr-app.tracking",
      detailType: "QR Code Scanned",
      detail: {
        qrId: scanData.qrId,
        scanAt: scanData.scanAt,
        country: scanData.country,
        device: scanData.device,
        ipAddress: scanData.ipAddress,
      },
    });
  }

  async publishUserMilestone(userId: string, milestone: string, data: any) {
    return this.publish({
      source: "qr-app.user-engagement",
      detailType: "User Milestone Reached",
      detail: {
        userId,
        milestone,
        ...data,
      },
    });
  }
}
```

---

## Caching Strategies

### Multi-layer Caching

```typescript
// utils/cache-manager.ts
import { Redis } from "@upstash/redis";

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  staleWhileRevalidate?: boolean;
}

export class CacheManager {
  private redis = new Redis({
    url: process.env.REDIS_URL!,
    token: process.env.REDIS_TOKEN!,
  });

  private inMemoryCache = new Map<
    string,
    { value: any; expires: number; tags: string[] }
  >();
  private maxInMemoryItems = 1000;

  /**
   * Get value from cache with fallback layers
   */
  async get<T>(key: string, fallback?: () => Promise<T>): Promise<T | null> {
    // Layer 1: In-memory cache (fastest)
    const memoryItem = this.inMemoryCache.get(key);
    if (memoryItem && memoryItem.expires > Date.now()) {
      return memoryItem.value;
    }

    // Layer 2: Redis cache (fast)
    try {
      const redisValue = await this.redis.get(key);
      if (redisValue) {
        // Populate memory cache
        this.setInMemory(key, redisValue, 60, []); // 1 minute in memory
        return redisValue as T;
      }
    } catch (error) {
      console.warn("Redis cache error:", error);
    }

    // Layer 3: Fallback function (slowest, but authoritative)
    if (fallback) {
      const value = await fallback();
      if (value) {
        // Cache the result in both layers
        await this.set(key, value, { ttl: 300 }); // 5 minutes in Redis
        this.setInMemory(key, value, 60, []); // 1 minute in memory
      }
      return value;
    }

    return null;
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, options: CacheOptions = {}) {
    const { ttl = 300, tags = [] } = options;

    // Set in Redis
    try {
      if (ttl > 0) {
        await this.redis.setex(key, ttl, JSON.stringify(value));
      } else {
        await this.redis.set(key, JSON.stringify(value));
      }

      // Store tags for invalidation
      if (tags.length > 0) {
        for (const tag of tags) {
          await this.redis.sadd(`tag:${tag}`, key);
          await this.redis.expire(`tag:${tag}`, ttl);
        }
      }
    } catch (error) {
      console.warn("Redis set error:", error);
    }

    // Set in memory cache
    this.setInMemory(key, value, Math.min(ttl, 300), tags);
  }

  /**
   * Delete from cache
   */
  async delete(key: string) {
    // Remove from Redis
    try {
      await this.redis.del(key);
    } catch (error) {
      console.warn("Redis delete error:", error);
    }

    // Remove from memory
    this.inMemoryCache.delete(key);
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTag(tag: string) {
    try {
      const keys = await this.redis.smembers(`tag:${tag}`);
      if (keys.length > 0) {
        // Remove from Redis
        await this.redis.del(...keys);
        await this.redis.del(`tag:${tag}`);

        // Remove from memory
        keys.forEach((key) => this.inMemoryCache.delete(key));
      }
    } catch (error) {
      console.warn("Cache invalidation error:", error);
    }
  }

  private setInMemory(
    key: string,
    value: any,
    ttlSeconds: number,
    tags: string[],
  ) {
    // Evict old items if cache is full
    if (this.inMemoryCache.size >= this.maxInMemoryItems) {
      const firstKey = this.inMemoryCache.keys().next().value;
      this.inMemoryCache.delete(firstKey);
    }

    this.inMemoryCache.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1000,
      tags,
    });
  }

  /**
   * Clear expired items from memory cache
   */
  clearExpired() {
    const now = Date.now();
    for (const [key, item] of this.inMemoryCache.entries()) {
      if (item.expires <= now) {
        this.inMemoryCache.delete(key);
      }
    }
  }
}

// Usage in API routes or components
export const cache = new CacheManager();

// Example usage
export async function getCachedQRCodes(userId: string) {
  return cache.get(`user:${userId}:qr-codes`, async () => {
    // Fallback to database query
    const { data } = await client.models.QrItems.list({
      filter: { ownerSub: { eq: userId } },
    });
    return data;
  });
}
```

### CDN and Edge Caching

```typescript
// utils/cdn-manager.ts
import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";

export class CDNManager {
  private cloudfront = new CloudFrontClient({ region: "us-east-1" }); // CloudFront is global
  private distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID!;

  /**
   * Invalidate specific paths in CloudFront
   */
  async invalidatePaths(paths: string[]) {
    const command = new CreateInvalidationCommand({
      DistributionId: this.distributionId,
      InvalidationBatch: {
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
        CallerReference: Date.now().toString(),
      },
    });

    const result = await this.cloudfront.send(command);
    console.log("CloudFront invalidation created:", result.Invalidation?.Id);
    return result;
  }

  /**
   * Invalidate QR code image after updates
   */
  async invalidateQRCode(qrId: string) {
    const paths = [
      `/qr-images/${qrId}.png`,
      `/qr-images/${qrId}_thumb.jpg`,
      `/qr-images/${qrId}_medium.png`,
      `/qr-images/${qrId}_large.png`,
    ];

    return this.invalidatePaths(paths);
  }

  /**
   * Warm up CDN cache for popular content
   */
  async warmupCache(urls: string[]) {
    // Pre-fetch URLs to warm up the cache
    const fetchPromises = urls.map((url) =>
      fetch(url, { method: "HEAD" }).catch(console.warn),
    );

    await Promise.all(fetchPromises);
    console.log(`Warmed up ${urls.length} URLs in CDN cache`);
  }
}
```

---

## Background Job Processing

### Queue-based Processing

```typescript
// utils/job-queue.ts
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";

export interface Job {
  id: string;
  type: string;
  payload: any;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  scheduledFor?: string;
}

export class JobQueue {
  private sqs = new SQSClient({ region: process.env.AWS_REGION });
  private queueUrl = process.env.JOB_QUEUE_URL!;

  async enqueue(
    jobType: string,
    payload: any,
    options: {
      delay?: number; // seconds
      maxAttempts?: number;
    } = {},
  ) {
    const job: Job = {
      id: crypto.randomUUID(),
      type: jobType,
      payload,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: new Date().toISOString(),
      scheduledFor: options.delay
        ? new Date(Date.now() + options.delay * 1000).toISOString()
        : undefined,
    };

    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(job),
      DelaySeconds: options.delay,
    });

    const result = await this.sqs.send(command);
    console.log(`Job enqueued: ${job.id} (${jobType})`);
    return result;
  }

  // Predefined job types
  async enqueueEmailNotification(userId: string, template: string, data: any) {
    return this.enqueue("send-email", {
      userId,
      template,
      data,
    });
  }

  async enqueueImageProcessing(imageKey: string, variants: string[]) {
    return this.enqueue("process-image", {
      imageKey,
      variants,
    });
  }

  async enqueueAnalyticsReport(
    userId: string,
    reportType: string,
    params: any,
  ) {
    return this.enqueue(
      "generate-report",
      {
        userId,
        reportType,
        params,
      },
      { delay: 60 },
    ); // Delay by 1 minute
  }

  async enqueueDataExport(userId: string, format: "csv" | "json" | "pdf") {
    return this.enqueue("export-data", {
      userId,
      format,
    });
  }
}

// Job processor Lambda function
// amplify/functions/job-processor/handler.ts
import { SQSEvent, SQSRecord } from "aws-lambda";

export const handler = async (event: SQSEvent) => {
  console.log(`Processing ${event.Records.length} jobs`);

  for (const record of event.Records) {
    await processJob(record);
  }
};

async function processJob(record: SQSRecord) {
  try {
    const job: Job = JSON.parse(record.body);
    console.log(`Processing job: ${job.id} (${job.type})`);

    switch (job.type) {
      case "send-email":
        await processEmailJob(job);
        break;
      case "process-image":
        await processImageJob(job);
        break;
      case "generate-report":
        await processReportJob(job);
        break;
      case "export-data":
        await processExportJob(job);
        break;
      default:
        console.warn(`Unknown job type: ${job.type}`);
    }

    console.log(`Job completed: ${job.id}`);
  } catch (error) {
    console.error("Job processing failed:", error);
    // Job will be retried automatically by SQS
    throw error;
  }
}

async function processEmailJob(job: Job) {
  const { userId, template, data } = job.payload;
  // Send email using SES
  console.log(`Sending ${template} email to user ${userId}`);
}

async function processImageJob(job: Job) {
  const { imageKey, variants } = job.payload;
  // Process image variants
  console.log(
    `Processing image ${imageKey} with variants: ${variants.join(", ")}`,
  );
}

async function processReportJob(job: Job) {
  const { userId, reportType, params } = job.payload;
  // Generate analytics report
  console.log(`Generating ${reportType} report for user ${userId}`);
}

async function processExportJob(job: Job) {
  const { userId, format } = job.payload;
  // Export user data
  console.log(`Exporting data for user ${userId} in ${format} format`);
}
```

This comprehensive guide covers advanced patterns that can elevate your MVP to a production-ready application. These patterns provide the foundation for building scalable, maintainable, and high-performance applications on AWS.
