import React from "react";
import { Spinner, Logo } from "../atoms";

export interface LoadingStateProps {
  message?: string;
  showLogo?: boolean;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
  showLogo = false,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {showLogo && (
          <div className="mb-6">
            <Logo size="md" showText={false} />
          </div>
        )}
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
};

export default LoadingState;
