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

        // 1. Get QR item from database
        const qrItemResult = await client.models.QrItems.get({ id: data.qrId });

        if (!qrItemResult.data) {
          throw new Error("QR code not found");
        }

        const qrItem = qrItemResult.data;
        const now = new Date().toISOString();

        // 2. Log the scan
        await client.models.QrScans.create({
          qrId: data.qrId,
          scanAt: now,
          ua:
            data.userAgent ||
            (typeof navigator !== "undefined" ? navigator.userAgent : ""),
          referer:
            data.referer ||
            (typeof document !== "undefined" ? document.referrer : ""),
          ip: "", // Client-side can't reliably get IP
          country: "", // Client-side can't get country info
        });

        // 3. Update QR item counters
        const currentScanCount = qrItem.scanCount || 0;
        await client.models.QrItems.update({
          id: data.qrId,
          scanCount: currentScanCount + 1,
          lastScanAt: now,
        });

        return qrItem.targetUrl;
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
