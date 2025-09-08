"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";

// Force dynamic rendering
export const dynamic = "force-dynamic";

interface QrResult {
  id: string;
  targetUrl: string;
  qrImageS3Key: string;
  trackingUrl: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { authStatus } = useAuthenticator();
  const [targetUrl, setTargetUrl] = useState("");
  const [label, setLabel] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrResult, setQrResult] = useState<QrResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && authStatus === "unauthenticated") {
      router.replace("/login");
    }
  }, [mounted, authStatus, router]);

  const generateQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) {
      setError("Please enter a URL");
      return;
    }

    setIsGenerating(true);
    setError("");
    setQrResult(null);

    try {
      const response = await fetch("/api/qr/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUrl: targetUrl.trim(),
          label: label.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate QR code");
      }

      const result = await response.json();
      setQrResult(result);
      setTargetUrl("");
      setLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!mounted || authStatus !== "authenticated") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          QR Code Generator
        </h1>
        <p className="text-lg text-gray-600">
          Generate trackable QR codes that redirect to your URLs
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
        <form onSubmit={generateQr} className="space-y-6">
          <div>
            <label
              htmlFor="targetUrl"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Target URL *
            </label>
            <input
              id="targetUrl"
              type="url"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              The URL where users will be redirected when they scan the QR code
            </p>
          </div>

          <div>
            <label
              htmlFor="label"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Label (optional)
            </label>
            <input
              id="label"
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="My Campaign"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <p className="mt-1 text-sm text-gray-500">
              A friendly name to help you identify this QR code
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isGenerating}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isGenerating ? "Generating..." : "Generate QR Code"}
          </button>
        </form>
      </div>

      {qrResult && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
              <svg
                className="w-6 h-6 text-green-600"
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              QR Code Generated!
            </h2>
            <p className="text-gray-600">Your QR code is ready to use</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                QR Code Image
              </h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4">
                <img
                  src={`/qr/img/${qrResult.id}`}
                  alt="Generated QR Code"
                  className="w-48 h-48 mx-auto"
                />
              </div>
              <button
                onClick={() =>
                  copyToClipboard(
                    `${window.location.origin}/qr/img/${qrResult.id}`
                  )
                }
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                Copy Image URL
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Details
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  QR ID
                </label>
                <code className="block bg-gray-100 border border-gray-200 rounded px-3 py-2 text-sm font-mono text-gray-800">
                  {qrResult.id}
                </code>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target URL
                </label>
                <a
                  href={qrResult.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:text-blue-700 underline break-all"
                >
                  {qrResult.targetUrl}
                </a>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tracking URL
                </label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-gray-100 border border-gray-200 rounded px-3 py-2 text-sm font-mono text-gray-800 break-all">
                    {qrResult.trackingUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(qrResult.trackingUrl)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  This URL tracks clicks and redirects to your target URL
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => setQrResult(null)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Generate Another QR Code
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
