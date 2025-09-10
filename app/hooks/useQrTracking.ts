"use client";

import { useState, useCallback } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

export interface QrTrackingData {
  qrId: string;
  userAgent?: string;
  referer?: string;
}

export interface UseQrTrackingReturn {
  trackAndRedirect: (data: QrTrackingData) => Promise<string | null>;
  isTracking: boolean;
  error: string | null;
}

export const useQrTracking = (): UseQrTrackingReturn => {
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trackAndRedirect = useCallback(
    async (data: QrTrackingData): Promise<string | null> => {
      setIsTracking(true);
      setError(null);

      try {
        // Create client inside the function to ensure Amplify is configured
        const client = generateClient<Schema>();

        // Call the trackQr Lambda function via GraphQL
        const result = await client.queries.trackQr({ qrId: data.qrId });

        if (result.errors || !result.data) {
          throw new Error("QR code not found");
        }

        const trackingResult = JSON.parse(result.data as string);
        return trackingResult.targetUrl;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to track QR scan";
        setError(errorMessage);
        console.error("Error tracking QR scan:", err);
        return null;
      } finally {
        setIsTracking(false);
      }
    },
    []
  );

  return {
    trackAndRedirect,
    isTracking,
    error,
  };
};
