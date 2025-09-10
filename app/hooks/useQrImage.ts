"use client";

import { useState, useEffect } from "react";
import { getUrl } from "aws-amplify/storage";

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

        // Generate signed URL for the QR image
        const s3Key = `qr-images/${qrId}.png`;

        const result = await getUrl({
          path: s3Key,
          options: {
            expiresIn: 3600, // 1 hour
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
