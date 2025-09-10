import type { Schema } from "../../data/resource";
import { generateClient } from "aws-amplify/data";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import QRCode from "qrcode";
import { ulid } from "ulid";

// Initialize AWS clients with proper region configuration
const region = process.env.AWS_REGION || "ap-southeast-2";
const s3Client = new S3Client({ region });

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

    // Use Amplify Data client to save QR item
    // Configure Amplify for server-side usage
    const client = generateClient<Schema>({
      authMode: "iam",
    });

    const now = new Date().toISOString();

    // Create QR item using Amplify Data client
    await client.models.QrItems.create({
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
    });

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
