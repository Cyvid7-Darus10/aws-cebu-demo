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
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12 animate-in fade-in duration-500">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg animate-in zoom-in duration-600">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-4.01M12 12v4m6-7a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          QR Code Generator
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Create beautiful, trackable QR codes that provide insights into your
          audience
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-in slide-in-from-bottom duration-500 delay-200">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Lightning Fast
          </h3>
          <p className="text-gray-600 text-sm">Generate QR codes in seconds</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Track Everything
          </h3>
          <p className="text-gray-600 text-sm">Monitor clicks and analytics</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Always Reliable
          </h3>
          <p className="text-gray-600 text-sm">99.9% uptime guarantee</p>
        </div>
      </div>

      {/* Generator Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 animate-in slide-in-from-bottom duration-500 delay-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
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
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Create New QR Code
          </h2>
        </div>

        <form onSubmit={generateQr} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="targetUrl"
                className="block text-sm font-semibold text-gray-700 mb-3"
              >
                Target URL *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                </div>
                <input
                  id="targetUrl"
                  type="url"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 focus:shadow-lg"
                  placeholder="https://example.com"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  required
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                The destination URL for your QR code
              </p>
            </div>

            <div>
              <label
                htmlFor="label"
                className="block text-sm font-semibold text-gray-700 mb-3"
              >
                Label (optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                </div>
                <input
                  id="label"
                  type="text"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 focus:shadow-lg"
                  placeholder="My Campaign"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                A friendly name for organization
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg animate-in fade-in duration-200">
              <div className="flex">
                <svg
                  className="w-5 h-5 text-red-400 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isGenerating}
            className="w-full inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden group"
          >
            {isGenerating ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-200 border-t-white"></div>
                <span>Generating your QR code...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5 group-hover:scale-110 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-4.01M12 12v4m6-7a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Generate QR Code</span>
              </div>
            )}
          </button>
        </form>
      </div>

      {/* QR Result */}
      {qrResult && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-in zoom-in duration-600">
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
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Your QR Code
              </h3>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-8 mb-6 group hover:border-blue-300 transition-colors">
                <img
                  src={`/qr/img/${qrResult.id}`}
                  alt="Generated QR Code"
                  className="w-48 h-48 mx-auto rounded-lg shadow-lg group-hover:scale-105 transition-transform"
                />
              </div>
              <button
                onClick={() =>
                  copyToClipboard(
                    `${window.location.origin}/qr/img/${qrResult.id}`
                  )
                }
                className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
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
              </button>
            </div>

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
                    {qrResult.id}
                  </code>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target URL
                  </label>
                  <a
                    href={qrResult.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:text-blue-700 underline break-all bg-white border border-gray-200 rounded px-3 py-2"
                  >
                    {qrResult.targetUrl}
                  </a>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tracking URL
                  </label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-white border border-gray-200 rounded px-3 py-2 text-sm font-mono text-gray-800 break-all">
                      {qrResult.trackingUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(qrResult.trackingUrl)}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
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
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    This URL tracks clicks and redirects to your target URL
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => setQrResult(null)}
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
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
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
