"use client";

import { cn } from "@/lib/utils/cn";

interface SkeletonProps {
  className?: string;
  variant?: "rectangle" | "circle" | "text";
}

export function Skeleton({ className, variant = "rectangle" }: SkeletonProps) {
  const variantClasses = {
    rectangle: "rounded-lg",
    circle: "rounded-full",
    text: "rounded h-4",
  };

  return (
    <div
      className={cn(
        "animate-pulse bg-gray-200",
        variantClasses[variant],
        className
      )}
    />
  );
}
