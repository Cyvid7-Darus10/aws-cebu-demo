"use client";

import React from "react";
import { Button, Card } from "../atoms";
import { QrCodeDisplay } from "../molecules";
import { useQrDownload } from "../../hooks/useQrDownload";

export interface QrResult {
  id: string;
  targetUrl: string;
  qrImageS3Key: string;
  trackingUrl: string;
}

export interface QrResultDisplayProps {
  result: QrResult;
  onCreateAnother: () => void;
  onCopyUrl: (url: string) => void;
}

const QrResultDisplay: React.FC<QrResultDisplayProps> = ({
  result,
  onCreateAnother,
  onCopyUrl,
}) => {
  const { downloadQr, isDownloading, error: downloadError } = useQrDownload();
  return (
    <Card className="animate-in zoom-in duration-600">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          QR Code Generated!
        </h2>
        <p className="text-gray-600">
          Your trackable QR code is ready to share
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* QR Code Display */}
        <QrCodeDisplay
          qrId={result.id}
          onCopyImageUrl={() =>
            onCopyUrl(`${window.location.origin}/qr/img/${result.id}`)
          }
        />

        {/* Details */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Details & Analytics
          </h3>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                QR ID
              </label>
              <code className="block bg-white border border-gray-200 rounded px-3 py-2 text-sm font-mono text-gray-800">
                {result.id}
              </code>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target URL
              </label>
              <a
                href={result.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-600 hover:text-blue-700 underline break-all bg-white border border-gray-200 rounded px-3 py-2"
              >
                {result.targetUrl}
              </a>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tracking URL
              </label>
              <div className="flex gap-2">
                <code className="flex-1 bg-white border border-gray-200 rounded px-3 py-2 text-sm font-mono text-gray-800 break-all">
                  {result.trackingUrl}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopyUrl(result.trackingUrl)}
                  className="flex-shrink-0"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </Button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                This URL tracks clicks and redirects to your target URL
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Download Error */}
      {downloadError && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{downloadError}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8 pt-6 border-t border-gray-200">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => downloadQr(result.id)}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <>
              <svg
                className="animate-spin w-5 h-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Downloading...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download QR Code
            </>
          )}
        </Button>
        <Button size="lg" onClick={onCreateAnother}>
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Create Another QR Code
        </Button>
      </div>
    </Card>
  );
};

export default QrResultDisplay;
