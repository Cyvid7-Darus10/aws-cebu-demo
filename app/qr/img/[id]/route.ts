import { NextRequest, NextResponse } from "next/server";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { getUrl } from "aws-amplify/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const qrId = params.id;

    if (!qrId) {
      return NextResponse.json({ error: "QR ID is required" }, { status: 400 });
    }

    // Get QR item from database to retrieve the correct S3 key
    const client = generateClient<Schema>();
    const qrItemResult = await client.models.QrItems.get({ id: qrId });

    if (!qrItemResult.data) {
      return NextResponse.json({ error: "QR code not found" }, { status: 404 });
    }

    const qrItem = qrItemResult.data;

    if (!qrItem.s3Key) {
      return NextResponse.json(
        { error: "QR image not available" },
        { status: 404 }
      );
    }

    // Generate signed URL using the actual S3 key from database
    const result = await getUrl({
      path: qrItem.s3Key,
      options: {
        expiresIn: 3600, // 1 hour
        validateObjectExistence: true,
      },
    });

    // Redirect to the signed S3 URL
    return NextResponse.redirect(result.url.toString());
  } catch (error) {
    console.error("Error fetching QR image:", error);
    return NextResponse.json(
      { error: "Failed to load QR image" },
      { status: 500 }
    );
  }
}
