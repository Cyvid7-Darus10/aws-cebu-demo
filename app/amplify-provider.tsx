"use client";

import { PropsWithChildren, useEffect, useState } from "react";
import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";

export function AmplifyProvider({ children }: PropsWithChildren) {
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    try {
      Amplify.configure(outputs);
      setIsConfigured(true);
    } catch (error) {
      console.error("Amplify configuration error:", error);
      setIsConfigured(true); // Still render to avoid blocking the app
    }
  }, []);

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return <Authenticator.Provider>{children}</Authenticator.Provider>;
}
