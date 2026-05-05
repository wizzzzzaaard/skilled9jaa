"use client";

import Image from "next/image";
import { cn } from "@/lib/utils/cn";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  isOnline?: boolean;
}

const sizeMap = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-lg",
  xl: "w-24 h-24 text-2xl",
};

export function Avatar({ src, name, size = "md", className, isOnline }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn("relative inline-block", className)}>
      <div
        className={cn(
          "rounded-full overflow-hidden bg-accent/20 flex items-center justify-center text-primary font-semibold",
          sizeMap[size]
        )}
      >
        {src ? (
          <Image
            src={src}
            alt={name}
            width={96}
            height={96}
            className="w-full h-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      {isOnline !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white",
            isOnline ? "bg-success" : "bg-gray-400"
          )}
        />
      )}
    </div>
  );
}
