import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Missing QR ID" }, { status: 400 });
    }

    // Get environment variables from Amplify outputs
    const qrItemsTable = process.env.AMPLIFY_DATA_QRITEMS_TABLE_NAME;
    const qrScansTable = process.env.AMPLIFY_DATA_QRSCANS_TABLE_NAME;

    if (!qrItemsTable || !qrScansTable) {
      console.error("Missing table environment variables");
      return NextResponse.json(
        { error: "Configuration error" },
        { status: 500 }
      );
    }

    // Get QR item from database
    const getResult = await dynamoClient.send(
      new GetCommand({
        TableName: qrItemsTable,
        Key: { id },
      })
    );

    if (!getResult.Item) {
      return NextResponse.json({ error: "QR code not found" }, { status: 404 });
    }

    const qrItem = getResult.Item;
    const now = new Date().toISOString();

    // Extract request metadata
    const headers = Object.fromEntries(request.headers.entries());
    const ua = headers["user-agent"] || "";
    const referer = headers["referer"] || "";
    const forwardedFor = headers["x-forwarded-for"] || "";
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "";
    const country = headers["cloudfront-viewer-country"] || "";

    // Log the scan
    await dynamoClient.send(
      new PutCommand({
        TableName: qrScansTable,
        Item: {
          qrId: id,
          scanAt: now,
          ua,
          referer,
          ip,
          country,
        },
      })
    );

    // Update QR item counters atomically
    await dynamoClient.send(
      new UpdateCommand({
        TableName: qrItemsTable,
        Key: { id },
        UpdateExpression:
          "SET scanCount = if_not_exists(scanCount, :zero) + :one, lastScanAt = :now",
        ExpressionAttributeValues: {
          ":zero": 0,
          ":one": 1,
          ":now": now,
        },
      })
    );

    // Return 302 redirect to target URL
    return NextResponse.redirect(qrItem.targetUrl, 302);
  } catch (error) {
    console.error("Error tracking QR scan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
