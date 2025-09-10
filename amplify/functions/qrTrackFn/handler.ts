import type { Schema } from "../../data/resource";
import { generateClient } from "aws-amplify/data";

export const handler: Schema["trackQr"]["functionHandler"] = async (event) => {
  try {
    const { qrId } = event.arguments;

    if (!qrId) {
      throw new Error("Missing QR ID");
    }

    // Use Amplify Data client
    const client = generateClient<Schema>({
      authMode: "iam",
    });

    // Get QR item from database
    const qrItemResult = await client.models.QrItems.get({ id: qrId });

    if (!qrItemResult.data) {
      throw new Error("QR code not found");
    }

    const qrItem = qrItemResult.data;
    const now = new Date().toISOString();

    // Log the scan (simplified metadata for GraphQL context)
    await client.models.QrScans.create({
      qrId,
      scanAt: now,
      ua: "", // Not available in GraphQL context
      referer: "",
      ip: "",
      country: "",
    });

    // Update QR item counters
    const currentScanCount = qrItem.scanCount || 0;
    await client.models.QrItems.update({
      id: qrId,
      scanCount: currentScanCount + 1,
      lastScanAt: now,
    });

    // Return the target URL for client-side redirect
    return {
      targetUrl: qrItem.targetUrl,
      scanCount: currentScanCount + 1,
    };
  } catch (error) {
    console.error("Error tracking QR scan:", error);
    throw error;
  }
};
