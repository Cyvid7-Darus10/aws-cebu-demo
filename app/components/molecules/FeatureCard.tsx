import React from "react";
import { Card } from "../atoms";

export interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconBgColor?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  iconBgColor = "bg-blue-100",
}) => {
  return (
    <Card variant="hover" className="text-center">
      <div
        className={`w-12 h-12 ${iconBgColor} rounded-xl flex items-center justify-center mx-auto mb-3`}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </Card>
  );
};

export default FeatureCard;
