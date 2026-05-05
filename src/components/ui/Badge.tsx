"use client";

import { cn } from "@/lib/utils/cn";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "outline";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variantClasses = {
    default: "bg-gray-100 text-text-secondary",
    success: "bg-green-100 text-success",
    warning: "bg-yellow-100 text-yellow-700",
    error: "bg-red-100 text-error",
    outline: "border border-gray-200 text-text-secondary",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
