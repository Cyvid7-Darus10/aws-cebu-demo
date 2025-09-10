import React from "react";
import { Spinner } from "../atoms";

export interface LoadingStateProps {
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
};

export default LoadingState;
