"use client";

import { useState, useEffect } from "react";
import { getUrl } from "aws-amplify/storage";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

export interface UseQrImageReturn {
  imageUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

export const useQrImage = (qrId: string): UseQrImageReturn => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!qrId) {
      setIsLoading(false);
      return;
    }

    const fetchQrImage = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get QR item from database to retrieve the correct S3 key
        const client = generateClient<Schema>();
        const qrItemResult = await client.models.QrItems.get({ id: qrId });

        if (!qrItemResult.data) {
          throw new Error("QR code not found");
        }

        const qrItem = qrItemResult.data;

        if (!qrItem.s3Key) {
          throw new Error("QR image not available");
        }

        // Generate signed URL using the actual S3 key from database
        const result = await getUrl({
          path: qrItem.s3Key,
          options: {
            expiresIn: 3600, // 1 hour
            validateObjectExistence: true,
          },
        });

        setImageUrl(result.url.toString());
      } catch (err) {
        console.error("Error fetching QR image:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load QR image"
        );
        setImageUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQrImage();
  }, [qrId]);

  return {
    imageUrl,
    isLoading,
    error,
  };
};
