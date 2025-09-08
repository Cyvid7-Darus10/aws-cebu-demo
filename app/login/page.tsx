"use client";

import { useRouter } from "next/navigation";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Pastelero
          </h1>
          <p className="text-gray-600">
            Sign in to create and manage your QR codes
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <Authenticator>
            {({ user }) => {
              if (user) {
                router.replace("/dashboard");
              }
              return <div />;
            }}
          </Authenticator>
        </div>
      </div>
    </main>
  );
}
