import type { Schema } from "../../data/resource";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import QRCode from "qrcode";

// Initialize AWS clients with proper region configuration
const region = process.env.AWS_REGION || "ap-southeast-2";
const s3Client = new S3Client({ region });

export const handler: Schema["uploadQrImage"]["functionHandler"] = async (
  event
) => {
  try {
    const { targetUrl, qrId } = event.arguments;

    // Validate URL (basic validation)
    if (!targetUrl) {
      throw new Error("URL is required");
    }

    // Get environment variables
    const bucketName = process.env.AMPLIFY_STORAGE_BUCKET_NAME;
    const qrPrefix = "qr-images/";
    const baseUrl = process.env.BASE_URL || "https://localhost:3000";

    if (!bucketName) {
      throw new Error("Missing storage bucket configuration");
    }

    // Create tracking URL using provided QR ID
    const trackingUrl = `${baseUrl}/qr/${qrId}`;

    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(trackingUrl, {
      type: "png",
      width: 300,
      margin: 2,
    });

    // S3 key for the QR image
    const s3Key = `${qrPrefix}${qrId}.png`;

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

    return {
      success: true,
      s3Key,
      trackingUrl,
    };
  } catch (error) {
    console.error("Error uploading QR image to S3:", error);
    throw error;
  }
};
