"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { LoadingState } from "./components/molecules";

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

  return <LoadingState message="Loading..." showLogo />;
}
