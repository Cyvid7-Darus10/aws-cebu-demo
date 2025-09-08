import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

// Initialize AWS clients
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { id } = event.pathParameters || {};

    if (!id) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing QR ID" }),
      };
    }

    const qrItemsTable = process.env.AMPLIFY_DATA_QRITEMS_TABLE_NAME;
    const qrScansTable = process.env.AMPLIFY_DATA_QRSCANS_TABLE_NAME;

    if (!qrItemsTable || !qrScansTable) {
      throw new Error("Missing required environment variables");
    }

    // Get QR item from database
    const getResult = await dynamoClient.send(
      new GetCommand({
        TableName: qrItemsTable,
        Key: { id },
      })
    );

    if (!getResult.Item) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "QR code not found" }),
      };
    }

    const qrItem = getResult.Item;
    const now = new Date().toISOString();

    // Extract request metadata
    const headers = event.headers || {};
    const ua = headers["User-Agent"] || headers["user-agent"] || "";
    const referer = headers["Referer"] || headers["referer"] || "";
    const forwardedFor =
      headers["X-Forwarded-For"] || headers["x-forwarded-for"] || "";
    const ip = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : event.requestContext?.identity?.sourceIp || "";
    const country =
      headers["CloudFront-Viewer-Country"] ||
      headers["cloudfront-viewer-country"] ||
      "";

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
    return {
      statusCode: 302,
      headers: {
        Location: qrItem.targetUrl,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
      body: "",
    };
  } catch (error) {
    console.error("Error tracking QR scan:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
