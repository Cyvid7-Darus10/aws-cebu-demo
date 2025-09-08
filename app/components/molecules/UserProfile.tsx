import React from "react";
import { Avatar } from "../atoms";

export interface UserProfileProps {
  username: string;
  size?: "sm" | "md" | "lg";
  showUsername?: boolean;
  className?: string;
}

const UserProfile: React.FC<UserProfileProps> = ({
  username,
  size = "md",
  showUsername = true,
  className,
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Avatar name={username} size={size} />
      {showUsername && (
        <span
          className={`text-gray-700 font-medium ${
            size === "sm" ? "text-sm" : "text-sm"
          }`}
        >
          {username}
        </span>
      )}
    </div>
  );
};

export default UserProfile;
