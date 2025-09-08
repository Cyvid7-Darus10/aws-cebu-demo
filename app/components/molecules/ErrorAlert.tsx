import React from "react";

export interface ErrorAlertProps {
  message: string;
  className?: string;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, className = "" }) => {
  return (
    <div
      className={`bg-red-50 border-l-4 border-red-400 p-4 rounded-lg animate-in fade-in duration-200 ${className}`}
    >
      <div className="flex">
        <svg
          className="w-5 h-5 text-red-400 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <p className="text-red-700 font-medium">{message}</p>
      </div>
    </div>
  );
};

export default ErrorAlert;
