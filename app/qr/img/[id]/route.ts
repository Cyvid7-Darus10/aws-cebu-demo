import { NextRequest, NextResponse } from "next/server";
import { getUrl } from "aws-amplify/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Missing QR ID" }, { status: 400 });
    }

    // Generate signed URL for the QR image
    const s3Key = `qr-images/${id}.png`;

    try {
      const signedUrl = await getUrl({
        key: s3Key,
        options: {
          expiresIn: 3600, // 1 hour
        },
      });

      // Redirect to the signed URL
      return NextResponse.redirect(signedUrl.url.toString());
    } catch (storageError) {
      console.error("Error getting signed URL:", storageError);
      return NextResponse.json(
        { error: "QR image not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error serving QR image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
