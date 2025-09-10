"use client";

import { useState, useCallback } from "react";
import { generateClient } from "aws-amplify/data";
import { getUrl } from "aws-amplify/storage";
import type { Schema } from "@/amplify/data/resource";

export interface UseQrDownloadReturn {
  downloadQr: (qrId: string, filename?: string) => Promise<void>;
  isDownloading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useQrDownload = (): UseQrDownloadReturn => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadQr = useCallback(async (qrId: string, filename?: string) => {
    setIsDownloading(true);
    setError(null);

    try {
      // Get QR item from database to get S3 key
      const client = generateClient<Schema>();
      const result = await client.models.QrItems.get({ id: qrId });

      if (!result.data) {
        throw new Error("QR code not found");
      }

      const qrItem = result.data;

      // Get signed URL from S3
      const imageUrl = await getUrl({
        path: qrItem.s3Key,
        options: {
          validateObjectExistence: true,
          expiresIn: 300, // 5 minutes
        },
      });

      // Fetch the image from S3
      const response = await fetch(imageUrl.url.toString());

      if (!response.ok) {
        throw new Error(
          `Failed to fetch image: ${response.status} ${response.statusText}`
        );
      }

      // Get the image blob
      const blob = await response.blob();

      // Create filename with sanitized target URL
      let downloadFilename = filename;
      if (!downloadFilename) {
        const sanitizedUrl = qrItem.targetUrl
          .replace(/https?:\/\//, "")
          .replace(/[^a-zA-Z0-9.-]/g, "_")
          .substring(0, 50);
        downloadFilename = `qr_${sanitizedUrl}_${qrId}.png`;
      }

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadFilename;

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Download failed";
      setError(errorMessage);
      console.error("Error downloading QR code:", err);
    } finally {
      setIsDownloading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    downloadQr,
    isDownloading,
    error,
    clearError,
  };
};
