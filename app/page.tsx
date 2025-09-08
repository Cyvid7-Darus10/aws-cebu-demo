"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { authStatus } = useAuthenticator();

  useEffect(() => {
    if (mounted) {
      if (authStatus === "authenticated") {
        router.replace("/dashboard");
      } else if (authStatus === "unauthenticated") {
        router.replace("/login");
      }
    }
  }, [authStatus, router, mounted]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </main>
  );
}
