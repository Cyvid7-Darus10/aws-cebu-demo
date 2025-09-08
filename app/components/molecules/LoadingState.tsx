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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center animate-in fade-in duration-500">
        {showLogo && (
          <div className="mb-4 animate-in zoom-in duration-600">
            <Logo size="lg" showText={false} />
          </div>
        )}
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
};

export default LoadingState;
