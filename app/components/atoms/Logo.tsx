import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  animated?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({
  size = "md",
  showText = true,
  animated = false,
  className,
}) => {
  const sizes = {
    sm: {
      icon: "w-6 h-6",
      text: "text-lg",
    },
    md: {
      icon: "w-8 h-8",
      text: "text-xl",
    },
    lg: {
      icon: "w-16 h-16",
      text: "text-4xl",
    },
  };

  const iconContent = (
    <div
      className={cn(
        "bg-gray-900 rounded-lg flex items-center justify-center",
        sizes[size].icon,
        animated && "group-hover:scale-105 transition-transform"
      )}
    >
      <span className="text-white font-bold text-sm">P</span>
    </div>
  );

  const textContent = showText && (
    <span className={cn("font-bold text-gray-900", sizes[size].text)}>
      Pastelero
    </span>
  );

  return (
    <Link href="/" className={cn("flex items-center gap-2 group", className)}>
      {iconContent}
      {textContent}
    </Link>
  );
};

export default Logo;
