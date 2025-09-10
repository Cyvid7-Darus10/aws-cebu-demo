"use client";

import { useState, useCallback } from "react";

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
      // Fetch QR image from download API
      const response = await fetch(`/api/qr/download/${qrId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to download QR image");
      }

      // Get the image blob
      const blob = await response.blob();

      // Get filename from Content-Disposition header or use provided/default
      let downloadFilename = filename;
      if (!downloadFilename) {
        const contentDisposition = response.headers.get("Content-Disposition");
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
          downloadFilename = filenameMatch
            ? filenameMatch[1]
            : `qr_${qrId}.png`;
        } else {
          downloadFilename = `qr_${qrId}.png`;
        }
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
