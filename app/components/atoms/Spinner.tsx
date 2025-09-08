import React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: "blue" | "white" | "gray";
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  color = "blue",
  className,
}) => {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const colors = {
    blue: "border-gray-200 border-t-blue-600",
    white: "border-gray-200 border-t-white",
    gray: "border-gray-300 border-t-gray-600",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2",
        sizes[size],
        colors[color],
        className
      )}
    />
  );
};

export default Spinner;
