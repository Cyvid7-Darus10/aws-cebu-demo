"use client";

import { useState, useCallback, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

export interface QrItem {
  id: string;
  targetUrl: string;
  s3Key: string;
  createdAt: string;
  lastScanAt?: string;
  scanCount: number;
}

export interface UseQrManagementReturn {
  qrItems: QrItem[];
  isLoading: boolean;
  error: string | null;
  fetchQrItems: () => Promise<void>;
  deleteQrItem: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export const useQrManagement = (): UseQrManagementReturn => {
  const [qrItems, setQrItems] = useState<QrItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQrItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Create client inside the function to ensure Amplify is configured
      const client = generateClient<Schema>();

      // Query QR items for the authenticated user only
      const result = await client.models.QrItems.list({
        limit: 100,
        authMode: "userPool", // Use user pool authentication to filter by owner
      });

      if (result.errors) {
        throw new Error(
          result.errors[0]?.message || "Failed to fetch QR codes"
        );
      }

      const items =
        result.data?.map((item) => ({
          id: item.id,
          targetUrl: item.targetUrl,
          s3Key: item.s3Key,
          createdAt: item.createdAt,
          lastScanAt: item.lastScanAt || undefined,
          scanCount: item.scanCount || 0,
        })) || [];

      // Sort by creation date (newest first)
      items.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setQrItems(items);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch QR codes";
      setError(errorMessage);
      console.error("Error fetching QR items:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteQrItem = useCallback(async (id: string) => {
    setIsDeleting(true);
    setError(null);

    try {
      // Create client inside the function to ensure Amplify is configured
      const client = generateClient<Schema>();

      // Delete QR item (only owner can delete due to authorization rules)
      const result = await client.models.QrItems.delete(
        {
          id,
        },
        {
          authMode: "userPool", // Use user pool authentication for owner-based deletion
        }
      );

      if (result.errors) {
        throw new Error(
          result.errors[0]?.message || "Failed to delete QR code"
        );
      }

      // Remove the item from local state
      setQrItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete QR code";
      setError(errorMessage);
      console.error("Error deleting QR item:", err);
    } finally {
      setIsDeleting(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchQrItems();
  }, [fetchQrItems]);

  return {
    qrItems,
    isLoading,
    error,
    fetchQrItems,
    deleteQrItem,
    isDeleting,
  };
};
