"use client";

import React, { useState } from "react";
import { Button, Card } from "../atoms";
import { FormField, ErrorAlert } from "../molecules";

export interface QrGeneratorFormProps {
  onSubmit: (data: { targetUrl: string; label?: string }) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

const QrGeneratorForm: React.FC<QrGeneratorFormProps> = ({
  onSubmit,
  isLoading = false,
  error,
}) => {
  const [targetUrl, setTargetUrl] = useState("");
  const [label, setLabel] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;

    await onSubmit({
      targetUrl: targetUrl.trim(),
      label: label.trim() || undefined,
    });
  };

  const linkIcon = (
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
  );

  const tagIcon = (
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
  );

  return (
    <Card className="animate-in slide-in-from-bottom duration-500 delay-300">
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
        <h2 className="text-2xl font-bold text-gray-900">Create New QR Code</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            label="Target URL"
            type="url"
            placeholder="https://example.com"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            icon={linkIcon}
            helperText="The destination URL for your QR code"
            required
          />

          <FormField
            label="Label (optional)"
            type="text"
            placeholder="My Campaign"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            icon={tagIcon}
            helperText="A friendly name for organization"
          />
        </div>

        {error && <ErrorAlert message={error} />}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={isLoading}
          disabled={!targetUrl.trim()}
        >
          <svg
            className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform"
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
          {isLoading ? "Generating your QR code..." : "Generate QR Code"}
        </Button>
      </form>
    </Card>
  );
};

export default QrGeneratorForm;
