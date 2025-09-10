"use client";

import React from "react";
import { useQrManagement } from "../../hooks/useQrManagement";
import { Card, Button } from "../atoms";
import { LoadingState, ErrorAlert } from "../molecules";

export interface QrManagementProps {
  className?: string;
}

const QrManagement: React.FC<QrManagementProps> = ({ className = "" }) => {
  const { qrItems, isLoading, error, fetchQrItems, deleteQrItem, isDeleting } =
    useQrManagement();

  if (isLoading && qrItems.length === 0) {
    return <LoadingState message="Loading your QR codes..." />;
  }

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Your QR Codes</h2>
        <Button variant="secondary" onClick={fetchQrItems} disabled={isLoading}>
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error && <ErrorAlert message={error} className="mb-6" />}

      {qrItems.length === 0 && !isLoading ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <svg
              className="w-16 h-16 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No QR codes yet
          </h3>
          <p className="text-gray-600">
            Create your first QR code above to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {qrItems.map((item) => (
            <div
              key={item.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {item.targetUrl}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {item.scanCount} scans
                    </span>
                  </div>

                  <div className="text-sm text-gray-500 space-y-1">
                    <p>
                      <span className="font-medium">ID:</span> {item.id}
                    </p>
                    <p>
                      <span className="font-medium">Created:</span>{" "}
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                    {item.lastScanAt && (
                      <p>
                        <span className="font-medium">Last scan:</span>{" "}
                        {new Date(item.lastScanAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="mt-2 flex gap-2">
                    <a
                      href={`/qr/${item.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Test QR →
                    </a>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(
                          `${window.location.origin}/qr/${item.id}`
                        )
                      }
                      className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                    >
                      Copy URL
                    </button>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => deleteQrItem(item.id)}
                  disabled={isDeleting}
                  className="ml-4 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {isDeleting ? "..." : "Delete"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default QrManagement;
