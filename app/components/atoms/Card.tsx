import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "hover" | "elevated";
  children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const baseStyles = "bg-white rounded-xl border border-gray-200 p-6";

    const variants = {
      default: "shadow-sm",
      hover:
        "shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1",
      elevated: "shadow-xl",
    };

    return (
      <div
        className={cn(baseStyles, variants[variant], className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export default Card;
