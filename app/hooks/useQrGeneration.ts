"use client";

import { useState, useCallback } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { ulid } from "ulid";

export interface QrGenerationData {
  targetUrl: string;
  label?: string;
}

export interface QrResult {
  id: string;
  targetUrl: string;
  qrImageS3Key: string;
  trackingUrl: string;
}

export interface UseQrGenerationReturn {
  generateQr: (data: QrGenerationData) => Promise<void>;
  isGenerating: boolean;
  qrResult: QrResult | null;
  error: string | null;
  clearResult: () => void;
  clearError: () => void;
}

export const useQrGeneration = (): UseQrGenerationReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrResult, setQrResult] = useState<QrResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateQr = useCallback(async (data: QrGenerationData) => {
    setIsGenerating(true);
    setError(null);
    setQrResult(null);

    try {
      const client = generateClient<Schema>();

      // Validate and normalize URL
      let normalizedUrl = data.targetUrl;
      if (!normalizedUrl.match(/^https?:\/\//i)) {
        normalizedUrl = `https://${normalizedUrl}`;
      }

      // Check if QR code already exists for this URL for the current user
      const existingQrResult = await client.models.QrItems.list({
        filter: {
          targetUrl: { eq: normalizedUrl },
        },
        limit: 1,
        authMode: "userPool", // Use user pool authentication to filter by owner
      });

      if (existingQrResult.data && existingQrResult.data.length > 0) {
        const existingQr = existingQrResult.data[0];

        // Return existing QR instead of creating a new one
        setQrResult({
          id: existingQr.id,
          targetUrl: existingQr.targetUrl,
          qrImageS3Key: existingQr.s3Key,
          trackingUrl: `${window.location.origin}/qr/${existingQr.id}`,
        });

        return;
      }

      // Generate unique ID for new QR
      const id = ulid();
      const now = new Date().toISOString();

      // 1. Create QR item in database first
      const qrItem = await client.models.QrItems.create(
        {
          id,
          targetUrl: normalizedUrl,
          s3Key: "", // Will be updated after S3 upload
          createdAt: now,
          scanCount: 0,
        },
        {
          authMode: "userPool", // Use user pool authentication to set owner
        }
      );

      if (!qrItem.data) {
        throw new Error("Failed to create QR item in database");
      }

      // 2. Upload QR image to S3 via Lambda
      const uploadResult = await client.queries.uploadQrImage(
        {
          targetUrl: normalizedUrl,
          qrId: id,
        },
        {
          authMode: "userPool",
        }
      );

      if (uploadResult.errors) {
        console.error("S3 upload errors:", uploadResult.errors);
        throw new Error(
          uploadResult.errors[0]?.message || "Failed to upload QR image"
        );
      }

      if (!uploadResult.data) {
        throw new Error("No data returned from S3 upload");
      }

      const uploadData = JSON.parse(uploadResult.data as string);

      // 3. Update QR item with S3 key
      await client.models.QrItems.update(
        {
          id,
          s3Key: uploadData.s3Key,
        },
        {
          authMode: "userPool", // Use user pool authentication for owner-based update
        }
      );

      setQrResult({
        id,
        targetUrl: normalizedUrl,
        qrImageS3Key: uploadData.s3Key,
        trackingUrl: uploadData.trackingUrl,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      console.error("Error generating QR code:", err);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setQrResult(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generateQr,
    isGenerating,
    qrResult,
    error,
    clearResult,
    clearError,
  };
};
