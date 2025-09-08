import React from "react";
import { Button, Card } from "../atoms";

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
  return (
    <div className={`text-center ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Your QR Code</h3>
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-8 mb-6 group hover:border-blue-300 transition-colors">
        <img
          src={`/qr/img/${qrId}`}
          alt="Generated QR Code"
          className="w-48 h-48 mx-auto rounded-lg shadow-lg group-hover:scale-105 transition-transform"
        />
      </div>
      {onCopyImageUrl && (
        <Button variant="secondary" onClick={onCopyImageUrl} className="w-full">
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
