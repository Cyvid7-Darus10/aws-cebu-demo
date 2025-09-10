"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { Logo } from "../components/atoms";
import { FeatureCard, LoadingState } from "../components/molecules";
import { QrGeneratorForm, QrResultDisplay } from "../components/organisms";
import { useQrGeneration } from "../hooks/useQrGeneration";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { authStatus } = useAuthenticator();
  const { generateQr, isGenerating, qrResult, error, clearResult } =
    useQrGeneration();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && authStatus === "unauthenticated") {
      router.replace("/login");
    }
  }, [mounted, authStatus, router]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!mounted || authStatus !== "authenticated") {
    return <LoadingState message="Loading dashboard..." showLogo />;
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12 animate-in fade-in duration-500">
        <div className="flex justify-center mb-6">
          <Logo
            size="lg"
            showText={false}
            className="animate-in zoom-in duration-600"
          />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          QR Code Generator
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Create trackable QR codes with detailed analytics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-in slide-in-from-bottom duration-500 delay-200">
        <FeatureCard
          icon={
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
          }
          title="Lightning Fast"
          description="Generate QR codes in seconds"
          iconBgColor="bg-blue-100"
        />
        <FeatureCard
          icon={
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
          }
          title="Track Everything"
          description="Monitor clicks and analytics"
          iconBgColor="bg-purple-100"
        />
        <FeatureCard
          icon={
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
          }
          title="Always Reliable"
          description="99.9% uptime guarantee"
          iconBgColor="bg-green-100"
        />
      </div>

      <QrGeneratorForm
        onSubmit={generateQr}
        isLoading={isGenerating}
        error={error || ""}
      />

      {qrResult && (
        <QrResultDisplay
          result={qrResult}
          onCreateAnother={clearResult}
          onCopyUrl={copyToClipboard}
        />
      )}
    </main>
  );
}
