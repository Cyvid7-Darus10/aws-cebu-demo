"use client";

import { useRouter } from "next/navigation";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-8">
      <div className="max-w-md w-full">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-in fade-in duration-500">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg animate-in zoom-in duration-600">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Welcome to Pastelero
          </h1>
          <p className="text-gray-600 text-lg">
            Create and manage trackable QR codes with ease
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mb-8 animate-in slide-in-from-bottom duration-500 delay-200">
          <div className="text-center p-3 bg-white/50 rounded-lg border border-gray-100">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg
                className="w-4 h-4 text-blue-600"
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
            <p className="text-xs text-gray-600 font-medium">Generate QR</p>
          </div>
          <div className="text-center p-3 bg-white/50 rounded-lg border border-gray-100">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg
                className="w-4 h-4 text-purple-600"
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
            <p className="text-xs text-gray-600 font-medium">Track Clicks</p>
          </div>
          <div className="text-center p-3 bg-white/50 rounded-lg border border-gray-100">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg
                className="w-4 h-4 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <p className="text-xs text-gray-600 font-medium">Analytics</p>
          </div>
        </div>

        {/* Auth Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8 animate-in slide-in-from-bottom duration-500 delay-300">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Sign in to your account
            </h2>
            <p className="text-gray-600 text-sm">
              Start creating QR codes in seconds
            </p>
          </div>

          <Authenticator>
            {({ user }) => {
              if (user) {
                router.replace("/dashboard");
              }
              return <div />;
            }}
          </Authenticator>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 animate-in fade-in duration-500 delay-500">
          <p className="text-gray-500 text-sm">
            Secure authentication powered by AWS Amplify
          </p>
        </div>
      </div>
    </main>
  );
}
