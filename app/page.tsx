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
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-600">
          <span className="text-white font-bold text-xl">P</span>
        </div>
        <div className="w-8 h-8 mx-auto mb-4 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"></div>
        <p className="text-gray-600 font-medium">
          Preparing your experience...
        </p>
      </div>
    </main>
  );
}
