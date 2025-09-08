import type { Schema } from "../../data/resource";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import QRCode from "qrcode";
import { ulid } from "ulid";

// Initialize AWS clients
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3Client = new S3Client({});

// URL validation and normalization
function validateAndNormalizeUrl(url: string): string {
  if (!url) {
    throw new Error("URL is required");
  }

  // Block dangerous protocols
  if (url.match(/^(javascript|data|vbscript):/i)) {
    throw new Error("Invalid URL protocol");
  }

  // Add https if no protocol specified
  if (!url.match(/^https?:\/\//i)) {
    url = `https://${url}`;
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  return url;
}

export const handler: Schema["generateQr"]["functionHandler"] = async (
  event
) => {
  try {
    const { targetUrl, label } = event.arguments;

    // Validate and normalize URL
    const normalizedUrl = validateAndNormalizeUrl(targetUrl);

    // Generate unique ID
    const id = ulid();

    // Get environment variables (these will be set by Amplify automatically)
    const bucketName = process.env.AMPLIFY_STORAGE_BUCKET_NAME;
    const qrPrefix = "qr-images/";
    const baseUrl = process.env.BASE_URL || "https://localhost:3000";

    if (!bucketName) {
      throw new Error("Missing storage bucket configuration");
    }

    // Create tracking URL
    const trackingUrl = `${baseUrl}/qr/${id}`;

    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(trackingUrl, {
      type: "png",
      width: 300,
      margin: 2,
    });

    // S3 key for the QR image
    const s3Key = `${qrPrefix}${id}.png`;

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: qrBuffer,
        ContentType: "image/png",
        CacheControl: "public, max-age=31536000", // 1 year cache
      })
    );

    // Save to DynamoDB - Amplify will handle table names automatically
    const now = new Date().toISOString();

    // Use Amplify's data client instead of direct DynamoDB calls
    // This would be handled by the data layer, but for now we'll use env vars
    const qrItemsTable = process.env.AMPLIFY_DATA_QRITEMS_TABLE_NAME;

    if (qrItemsTable) {
      await dynamoClient.send(
        new PutCommand({
          TableName: qrItemsTable,
          Item: {
            id,
            targetUrl: normalizedUrl,
            s3Key,
            ownerSub:
              event.identity &&
              "identity" in event.identity &&
              "sub" in event.identity
                ? event.identity.sub
                : null,
            createdAt: now,
            scanCount: 0,
          },
        })
      );
    }

    return {
      id,
      targetUrl: normalizedUrl,
      qrImageS3Key: s3Key,
      trackingUrl,
    };
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
};
