import type { Schema } from "../../data/resource";
import { generateClient } from "aws-amplify/data";
import type { AppSyncResolverEvent } from "aws-lambda";

export const handler = async (event: AppSyncResolverEvent<unknown>) => {
  const fieldName = event.info?.fieldName;

  if (fieldName === "listQrItems") {
    return listQrItems(event as AppSyncResolverEvent<{ limit?: number }>);
  } else if (fieldName === "deleteQrItem") {
    return deleteQrItem(event as AppSyncResolverEvent<{ id: string }>);
  }

  throw new Error(`Unknown field: ${fieldName}`);
};

const listQrItems = async (event: AppSyncResolverEvent<{ limit?: number }>) => {
  try {
    const { limit } = event.arguments;

    // Use Amplify Data client
    const client = generateClient<Schema>({
      authMode: "iam",
    });

    // Get the current user's QR items
    const userSub =
      event.identity && "sub" in event.identity ? event.identity.sub : null;
    const result = await client.models.QrItems.list({
      limit: limit ?? 100,
      filter: userSub ? { ownerSub: { eq: userSub } } : undefined,
    });

    if (!result.data) {
      return [];
    }

    // Transform the data to include only necessary fields
    const qrItems = result.data.map((item) => ({
      id: item.id,
      targetUrl: item.targetUrl,
      s3Key: item.s3Key,
      createdAt: item.createdAt,
      lastScanAt: item.lastScanAt,
      scanCount: item.scanCount || 0,
    }));

    return qrItems;
  } catch (error) {
    console.error("Error listing QR items:", error);
    throw error;
  }
};

const deleteQrItem = async (event: AppSyncResolverEvent<{ id: string }>) => {
  try {
    const { id } = event.arguments;

    if (!id) {
      throw new Error("QR ID is required");
    }

    // Use Amplify Data client
    const client = generateClient<Schema>({
      authMode: "iam",
    });

    // First, get the QR item to verify ownership
    const getResult = await client.models.QrItems.get({ id });

    if (!getResult.data) {
      throw new Error("QR code not found");
    }

    // Check ownership if user is authenticated
    const userSub =
      event.identity && "sub" in event.identity ? event.identity.sub : null;
    if (userSub && getResult.data.ownerSub !== userSub) {
      throw new Error("Not authorized to delete this QR code");
    }

    // Delete the QR item
    const deleteResult = await client.models.QrItems.delete({ id });

    if (!deleteResult.data) {
      throw new Error("Failed to delete QR code");
    }

    // Note: Related scans are kept for analytics purposes
    // They can be cleaned up separately if needed

    return {
      success: true,
      deletedId: id,
    };
  } catch (error) {
    console.error("Error deleting QR item:", error);
    throw error;
  }
};
