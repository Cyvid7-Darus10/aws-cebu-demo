/**
 * QR Image Download API Route
 * Provides secure download functionality for QR code images
 */

import { NextRequest } from "next/server";
import { getUrl } from "aws-amplify/storage";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { createErrorResponse } from "@/lib/validation";
import { logger, createRequestContext } from "@/lib/monitoring";
import { qrCache } from "@/lib/cache";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const context = createRequestContext(request);

  try {
    const qrId = params.id;

    if (!qrId) {
      return createErrorResponse(
        "QR ID is required",
        400,
        null,
        context.requestId
      );
    }

    // Check cache first
    const cachedItem = qrCache.getQrItem(qrId);
    let qrItem = cachedItem;

    if (!qrItem) {
      // Get QR item from database
      const client = generateClient<Schema>();
      const result = await client.models.QrItems.get({ id: qrId });

      if (!result.data) {
        return createErrorResponse(
          "QR code not found",
          404,
          null,
          context.requestId
        );
      }

      qrItem = result.data;
      // Cache the item
      qrCache.setQrItem(qrId, qrItem, qrItem.owner);
    }

    // Get signed URL from S3
    const imageUrl = await getUrl({
      path: qrItem.s3Key,
      options: {
        validateObjectExistence: true,
        expiresIn: 300, // 5 minutes
      },
    });

    // Fetch the image from S3
    const imageResponse = await fetch(imageUrl.url.toString());

    if (!imageResponse.ok) {
      logger.error("Failed to fetch QR image from S3", undefined, {
        ...context,
        qrId,
        s3Key: qrItem.s3Key,
        status: imageResponse.status,
      });
      return createErrorResponse(
        "Failed to retrieve QR image",
        500,
        null,
        context.requestId
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    // Create filename with sanitized target URL
    const sanitizedUrl = qrItem.targetUrl
      .replace(/https?:\/\//, "")
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .substring(0, 50);

    const filename = `qr_${sanitizedUrl}_${qrId}.png`;

    logger.info("QR image downloaded", {
      ...context,
      qrId,
      targetUrl: qrItem.targetUrl,
      filename,
    });

    // Return image with appropriate headers for download
    return new Response(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": imageBuffer.byteLength.toString(),
        "Cache-Control": "private, max-age=300", // 5 minutes
        "X-Request-ID": context.requestId,
      },
    });
  } catch (error) {
    logger.error("QR download failed", error as Error, context);
    return createErrorResponse(
      "Failed to download QR image",
      500,
      null,
      context.requestId
    );
  }
}
