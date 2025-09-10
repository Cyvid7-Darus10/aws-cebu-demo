import type { Schema } from "../../data/resource";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import QRCode from "qrcode";

// Initialize AWS clients with proper region configuration
const region = process.env.AWS_REGION || "ap-southeast-2";
const s3Client = new S3Client({ region });

// Production configuration
const MAX_URL_LENGTH = 2048;
const ALLOWED_PROTOCOLS = ["http:", "https:"];
const QR_IMAGE_CONFIG = {
  width: 300,
  margin: 2,
  errorCorrectionLevel: "M" as const,
  type: "png" as const,
  quality: 0.92,
  color: {
    dark: "#000000",
    light: "#FFFFFF",
  },
};

/**
 * Validate and sanitize target URL
 */
function validateTargetUrl(url: string): string {
  if (!url || typeof url !== "string") {
    throw new Error("URL is required and must be a string");
  }

  if (url.length > MAX_URL_LENGTH) {
    throw new Error(
      `URL too long. Maximum length is ${MAX_URL_LENGTH} characters`
    );
  }

  // Normalize URL - add https if no protocol
  let normalizedUrl = url.trim();
  if (!normalizedUrl.match(/^https?:\/\//i)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  try {
    const urlObj = new URL(normalizedUrl);

    // Validate protocol
    if (!ALLOWED_PROTOCOLS.includes(urlObj.protocol)) {
      throw new Error(
        `Invalid protocol. Allowed protocols: ${ALLOWED_PROTOCOLS.join(", ")}`
      );
    }

    // Block localhost and private IPs in production
    if (process.env.NODE_ENV === "production") {
      const hostname = urlObj.hostname.toLowerCase();

      if (hostname === "localhost" || hostname === "127.0.0.1") {
        throw new Error("Localhost URLs are not allowed in production");
      }

      // Block private IP ranges
      const privateIpRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;
      if (privateIpRegex.test(hostname)) {
        throw new Error("Private IP addresses are not allowed in production");
      }
    }

    return urlObj.toString();
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid URL")) {
      throw new Error("Invalid URL format");
    }
    throw error;
  }
}

/**
 * Validate QR ID
 */
function validateQrId(qrId: string): string {
  if (!qrId || typeof qrId !== "string") {
    throw new Error("QR ID is required and must be a string");
  }

  if (qrId.length > 50) {
    throw new Error("QR ID is too long");
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(qrId)) {
    throw new Error("QR ID contains invalid characters");
  }

  return qrId;
}

export const handler: Schema["uploadQrImage"]["functionHandler"] = async (
  event
) => {
  const startTime = Date.now();

  try {
    const { targetUrl, qrId } = event.arguments;

    // Validate inputs
    const validatedUrl = validateTargetUrl(targetUrl);
    const validatedQrId = validateQrId(qrId);

    // Get environment variables
    const bucketName = process.env.AMPLIFY_STORAGE_BUCKET_NAME;
    const qrPrefix = "qr-images/";
    const baseUrl = process.env.BASE_URL || "https://localhost:3000";

    if (!bucketName) {
      throw new Error("Missing storage bucket configuration");
    }

    // Create tracking URL using provided QR ID
    const trackingUrl = `${baseUrl}/qr/${validatedQrId}`;

    // Generate QR code as PNG buffer with production settings
    const qrBuffer = await QRCode.toBuffer(trackingUrl, QR_IMAGE_CONFIG);

    // S3 key for the QR image with timestamp for uniqueness
    const timestamp = Date.now();
    const s3Key = `${qrPrefix}${validatedQrId}_${timestamp}.png`;

    // Upload to S3 with optimized settings
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: qrBuffer,
        ContentType: "image/png",
        CacheControl: "public, max-age=31536000, immutable", // 1 year cache, immutable
        Metadata: {
          "qr-id": validatedQrId,
          "target-url": validatedUrl,
          "created-at": new Date().toISOString(),
          "handler-version": "2.0.0",
        },
      })
    );

    const processingTime = Date.now() - startTime;

    // Log success metrics (structured logging for CloudWatch)
    process.stdout.write(
      JSON.stringify({
        level: "INFO",
        message: "QR image uploaded successfully",
        qrId: validatedQrId,
        s3Key,
        processingTime,
        timestamp: new Date().toISOString(),
      }) + "\n"
    );

    return {
      success: true,
      s3Key,
      trackingUrl,
      processingTime,
      metadata: {
        imageSize: qrBuffer.length,
        format: "png",
        dimensions: `${QR_IMAGE_CONFIG.width}x${QR_IMAGE_CONFIG.width}`,
      },
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Structured error logging for CloudWatch
    process.stderr.write(
      JSON.stringify({
        level: "ERROR",
        message: "Failed to upload QR image to S3",
        error: {
          name: (error as Error).name,
          message: (error as Error).message,
          stack: (error as Error).stack,
        },
        qrId: event.arguments.qrId,
        targetUrl: event.arguments.targetUrl,
        processingTime,
        timestamp: new Date().toISOString(),
      }) + "\n"
    );

    // Re-throw with sanitized error message for client
    if (error instanceof Error) {
      throw new Error(`QR generation failed: ${error.message}`);
    }

    throw new Error("QR generation failed due to an unexpected error");
  }
};
