import React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ name, size = "md", className }) => {
  const sizes = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const initials = name?.charAt(0).toUpperCase() || "?";

  return (
    <div
      className={cn(
        "bg-gray-700 rounded-full flex items-center justify-center text-white font-medium",
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
};

export default Avatar;
