"use client";

import { useRouter } from "next/navigation";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { Logo, Card } from "../components/atoms";
import { FeatureCard } from "../components/molecules";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="max-w-sm w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Logo size="md" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Sign in to Pastelero
          </h1>
          <p className="text-gray-600 text-sm">
            Create and manage trackable QR codes
          </p>
        </div>

        {/* Auth Form */}
        <Card className="bg-white">
          <Authenticator>
            {({ user }) => {
              if (user) {
                router.replace("/dashboard");
              }
              return <div />;
            }}
          </Authenticator>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-xs">Powered by AWS Amplify</p>
        </div>
      </div>
    </main>
  );
}
