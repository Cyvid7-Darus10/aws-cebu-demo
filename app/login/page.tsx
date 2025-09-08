"use client";

import { useRouter } from "next/navigation";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { Logo, Card } from "../components/atoms";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="max-w-sm w-full">
        <Authenticator>
          {({ user }) => {
            if (user) {
              router.replace("/dashboard");
            }
            return <div />;
          }}
        </Authenticator>
      </div>
    </main>
  );
}
