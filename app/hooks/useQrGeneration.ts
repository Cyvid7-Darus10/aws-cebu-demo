"use client";

import { useState, useCallback } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

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
      const result = await client.queries.generateQr(
        {
          targetUrl: data.targetUrl,
          label: data.label,
        },
        {
          authMode: "userPool",
        }
      );

      if (result.errors) {
        console.error("GraphQL errors:", result.errors);
        throw new Error(
          result.errors[0]?.message || "Failed to generate QR code"
        );
      }

      if (result.data) {
        const parsedData = JSON.parse(result.data as string);
        setQrResult(parsedData);
      } else {
        throw new Error("No data returned from QR generation");
      }
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
