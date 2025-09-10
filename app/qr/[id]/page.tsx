"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQrTracking } from "../../hooks/useQrTracking";
import { LoadingState } from "../../components/molecules";

export default function QrRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const { trackAndRedirect, error } = useQrTracking();
  const [hasRedirected, setHasRedirected] = useState(false);

  const qrId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (!qrId || hasRedirected) return;

    const handleRedirect = async () => {
      const targetUrl = await trackAndRedirect({
        qrId,
        userAgent: navigator.userAgent,
        referer: document.referrer,
      });

      if (targetUrl) {
        setHasRedirected(true);
        // Redirect to the target URL
        window.location.href = targetUrl;
      }
    };

    handleRedirect();
  }, [qrId, trackAndRedirect, hasRedirected]);

  if (!qrId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Invalid QR Code
          </h1>
          <p className="text-gray-600">The QR code ID is missing or invalid.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            QR Code Not Found
          </h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingState message="Redirecting..." />
    </div>
  );
}
