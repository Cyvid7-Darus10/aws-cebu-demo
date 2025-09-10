import React from "react";
import Image from "next/image";
import { Button } from "../atoms";
import { useQrImage } from "../../hooks/useQrImage";

export interface QrCodeDisplayProps {
  qrId: string;
  onCopyImageUrl?: () => void;
  className?: string;
}

const QrCodeDisplay: React.FC<QrCodeDisplayProps> = ({
  qrId,
  onCopyImageUrl,
  className = "",
}) => {
  const { imageUrl, isLoading, error } = useQrImage(qrId);

  return (
    <div className={`text-center ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Your QR Code</h3>
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-8 mb-6 group hover:border-blue-300 transition-colors">
        {isLoading ? (
          <div className="w-48 h-48 mx-auto flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="w-48 h-48 mx-auto flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-sm">Failed to load QR code</div>
              <div className="text-xs mt-1">{error}</div>
            </div>
          </div>
        ) : imageUrl ? (
          <Image
            src={imageUrl}
            alt="Generated QR Code"
            width={192}
            height={192}
            className="mx-auto rounded-lg shadow-lg group-hover:scale-105 transition-transform"
            unoptimized // QR codes are already optimized
          />
        ) : (
          <div className="w-48 h-48 mx-auto flex items-center justify-center text-gray-500">
            <div className="text-sm">No QR code available</div>
          </div>
        )}
      </div>
      {onCopyImageUrl && imageUrl && (
        <Button
          variant="secondary"
          onClick={() => onCopyImageUrl()}
          className="w-full"
        >
          <svg
            className="w-4 h-4 mr-2"
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
          Copy Image URL
        </Button>
      )}
    </div>
  );
};

export default QrCodeDisplay;
