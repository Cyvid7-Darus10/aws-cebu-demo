import { NextRequest, NextResponse } from "next/server";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();

interface CreateQrRequest {
  targetUrl: string;
  label?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateQrRequest = await request.json();

    if (!body.targetUrl) {
      return NextResponse.json(
        { error: "targetUrl is required" },
        { status: 400 }
      );
    }

    // Call the Amplify function via GraphQL
    const result = await client.queries.generateQr({
      targetUrl: body.targetUrl,
      label: body.label,
    });

    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      return NextResponse.json(
        { error: "Failed to generate QR code" },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Error creating QR code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
